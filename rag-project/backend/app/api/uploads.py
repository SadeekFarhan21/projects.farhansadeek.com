from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from pydantic import BaseModel
import boto3
import uuid
import os
from datetime import datetime, timedelta
from typing import Optional

from app.database import get_db
from app.models.models import Document, DocumentStatus, Batch
from app.services.s3_service import get_s3_client
from app.services.ingest_service import ingest_document

router = APIRouter()


class UploadInitRequest(BaseModel):
    filename: str
    mime_type: str
    size_bytes: int
    batch_id: Optional[str] = None
    # Optional path relative to a chosen root, e.g. "folder/sub/file.txt"
    relative_path: Optional[str] = None


class UploadInitResponse(BaseModel):
    document_id: str
    upload_url: str
    fields: dict


class BatchCreateRequest(BaseModel):
    name: Optional[str] = None


class BatchResponse(BaseModel):
    id: str
    name: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BatchWithDocumentsResponse(BaseModel):
    id: str
    name: Optional[str]
    created_at: datetime
    documents: list


@router.post("/init", response_model=UploadInitResponse)
async def init_upload(
    request: UploadInitRequest,
    db: Session = Depends(get_db)
):
    """Initialize file upload with presigned URL"""
    import os
    from pathlib import PurePosixPath

    # Generate unique document ID
    document_id = str(uuid.uuid4())
    
    # Validate batch if provided
    if request.batch_id:
        batch = db.query(Batch).filter(Batch.id == request.batch_id).first()
        if not batch:
            raise HTTPException(status_code=400, detail="Invalid batch_id")

    # Sanitize filename to basename
    base_name = os.path.basename(request.filename)

    # Normalize optional relative path (convert backslashes to slashes, remove traversal)
    rel_path_raw = request.relative_path or None
    safe_rel_path = None
    if rel_path_raw:
        rel_path_raw = rel_path_raw.replace("\\", "/")
        # Normalize and prevent path traversal
        norm = str(PurePosixPath(rel_path_raw))
        # Strip any leading slashes
        norm = norm.lstrip("/")
        # Ensure no parent traversal
        if ".." in PurePosixPath(norm).parts:
            safe_rel_path = base_name
        else:
            safe_rel_path = norm
    
    # Create S3 key using relative path if provided, else basename
    key_tail = safe_rel_path or base_name
    s3_key = f"uploads/{document_id}/{key_tail}"
    
    # Create document record
    document = Document(
        id=document_id,
        batch_id=request.batch_id,
        name=base_name,
        relative_path=safe_rel_path,
        mime_type=request.mime_type,
        size_bytes=request.size_bytes,
        status=DocumentStatus.UPLOADING,
        s3_key=s3_key
    )
    
    db.add(document)
    db.commit()
    db.refresh(document)
    
    # For local dev without S3/MinIO, support direct upload via backend
    return UploadInitResponse(
        document_id=document_id,
        upload_url="/api/uploads/direct",
        fields={
            "document_id": document_id,
            "filename": base_name,
            "relative_path": safe_rel_path or "",
            "direct": "true",
        }
    )


@router.post("/mock-upload")
async def mock_upload():
    """Mock upload endpoint for testing"""
    return {"message": "File uploaded successfully (mock)"}


@router.post("/direct")
async def direct_upload(
    document_id: str = Form(...),
    file: UploadFile = File(...),
    relative_path: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    """Accept file upload directly to the backend for local development."""
    # Ensure document exists
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    # Save to local disk
    import pathlib
    import shutil
    import os
    from pathlib import PurePosixPath

    uploads_root = pathlib.Path("uploaded_files")
    target_dir = uploads_root / document_id
    target_dir.mkdir(parents=True, exist_ok=True)

    # Determine final relative path
    base_name = os.path.basename(file.filename)
    rel_raw = relative_path or document.relative_path or base_name
    rel_raw = rel_raw.replace("\\", "/")
    norm_rel = str(PurePosixPath(rel_raw)).lstrip("/")
    # Prevent traversal
    if ".." in PurePosixPath(norm_rel).parts:
        norm_rel = base_name

    target_path = target_dir / norm_rel
    # Ensure nested directories exist
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with target_path.open("wb") as out_file:
        shutil.copyfileobj(file.file, out_file)

    # Update document record with local path
    document.s3_key = str(target_path)
    document.name = base_name
    # Persist normalized relative path for client display
    document.relative_path = norm_rel if norm_rel != base_name else None
    db.commit()

    return {"message": "File uploaded successfully (direct)", "path": str(target_path)}


@router.post("/{document_id}/complete")
async def complete_upload(
    document_id: str,
    db: Session = Depends(get_db)
):
    """Mark upload as complete and trigger ingestion"""
    
    document = db.query(Document).filter(Document.id == document_id).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if document.status != DocumentStatus.UPLOADING:
        raise HTTPException(status_code=400, detail="Document not in uploading state")
    
    # Update status to processing
    document.status = DocumentStatus.PROCESSING
    db.commit()

    # In local non-docker mode, ingest synchronously
    try:
        ingest_document(document, db)
    except Exception as e:
        document.status = DocumentStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

    return {"message": "Upload completed, document ready"}


@router.post("/batches", response_model=BatchResponse)
async def create_batch(
    request: BatchCreateRequest = BatchCreateRequest(),
    db: Session = Depends(get_db)
):
    """Create a new upload batch and return its ID."""
    batch_id = str(uuid.uuid4())
    batch = Batch(id=batch_id, name=request.name)
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.get("/batches/{batch_id}", response_model=BatchWithDocumentsResponse)
async def get_batch(batch_id: str, db: Session = Depends(get_db)):
    batch = db.query(Batch).filter(Batch.id == batch_id).first()
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")
    docs = db.query(Document).filter(Document.batch_id == batch_id).order_by(Document.created_at.asc()).all()
    documents = [
        {
            "id": d.id,
            "name": d.name,
            "relative_path": d.relative_path,
            "mime_type": d.mime_type,
            "size_bytes": d.size_bytes,
            "status": d.status.value if hasattr(d.status, 'value') else str(d.status),
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in docs
    ]
    return {
        "id": batch.id,
        "name": batch.name,
        "created_at": batch.created_at,
        "documents": documents,
    }
