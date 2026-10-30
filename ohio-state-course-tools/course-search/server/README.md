# OSU Course Scraper Server

A Node.js/Express server that scrapes course data from Ohio State University's course schedule website.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### Get All Subjects

- **GET** `/api/courses/subjects`
- Returns a list of all available course subjects

### Search for a Specific Course

- **GET** `/api/courses/search?semester=autumn%202025&subject=CSE&courseNumber=2421`
- Returns detailed course information including all sections
- **Query Parameters:**
  - `semester`: The semester (e.g., "autumn 2025", "spring 2025")
  - `subject`: The course subject (e.g., "CSE", "MATH")
  - `courseNumber`: The course number (e.g., "2421", "1110")

### Get Courses by Subject

- **GET** `/api/courses/:subject`
- Returns raw course data for a specific subject (e.g., CSE, MATH)
- Example: `http://localhost:3001/api/courses/CSE`

### Get Specific Course File

- **GET** `/api/courses/:subject/:courseFile`
- Returns data for a specific course file
- Example: `http://localhost:3001/api/courses/CSE/1258.txt`

### Health Check

- **GET** `/health`
- Returns server status

## Example Usage

```bash
# Get all subjects
curl http://localhost:3001/api/courses/subjects

# Search for CSE 2421 in Autumn 2025
curl "http://localhost:3001/api/courses/search?semester=autumn%202025&subject=CSE&courseNumber=2421"

# Get CSE courses
curl http://localhost:3001/api/courses/CSE

# Get specific course file
curl http://localhost:3001/api/courses/CSE/1258.txt
```

## Response Format for Course Search

The search endpoint returns structured data with the following format:

```json
{
  "subject": "CSE",
  "courseNumber": "2421",
  "semester": "autumn 2025",
  "sections": [
    {
      "courseNumber": "2421",
      "classNumber": "36158",
      "type": "L",
      "days": "TWRF",
      "time": "1020A",
      "location": "HI0306",
      "enrolled": "40",
      "capacity": "40",
      "waitlist": undefined
    }
  ]
}
```

## Data Source

This server scrapes data from: `https://www.asc.ohio-state.edu/barrett.3/schedule/`
