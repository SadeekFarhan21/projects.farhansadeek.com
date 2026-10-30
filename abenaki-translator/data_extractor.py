import csv
from docx import Document

def extract_dictionary_data(docx_path):
    doc = Document(docx_path)
    entries = []
    
    for para in doc.paragraphs:
        text = para.text.strip()
        parts = text.split(maxsplit=1)
        
        # Only include entries that have both an Abenaki word and a translation
        if len(parts) == 2:
            entries.append({'Abenaki': parts[0], 'English': parts[1]})
            
    return entries

def save_to_csv(entries, csv_path):
    if not entries:
        return
    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['Abenaki', 'English'])
        writer.writeheader()
        writer.writerows(entries)

if __name__ == "__main__":
    data = extract_dictionary_data('data/abenaki dictionary.docx')
    save_to_csv(data, 'data/abenaki_dictionary.csv')