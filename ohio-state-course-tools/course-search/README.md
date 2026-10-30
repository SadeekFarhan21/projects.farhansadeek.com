# Ohio State Course Search System

A complete web application for searching Ohio State University course schedules, built with a Next.js frontend and Express.js backend that scrapes data from the official OSU schedule website.

## Features

- **Real-time Course Search**: Search for specific courses by semester, subject, and course number
- **Smart Course Selection**: Dynamic dropdown that shows available courses for selected subject/semester
- **Detailed Section Information**: View all course sections with enrollment data, waitlists, times, and locations
- **Modern UI**: Beautiful, responsive interface with dark mode support
- **Live Data**: Scrapes current data from OSU's official schedule website
- **Multiple Semesters**: Support for Autumn, Spring, and Summer semesters

## Architecture

### Frontend (Next.js)

- **Port**: 3002
- **Location**: `/app/`
- **Features**: React-based UI with TypeScript, responsive design, modern CSS

### Backend (Express.js)

- **Port**: 3001
- **Location**: `/server/`
- **Features**: RESTful API, web scraping, data parsing, CORS enabled

## Quick Start

1. **Start the Backend Server**:

   ```bash
   cd server
   npm install
   npm run dev
   ```

   Server will run on http://localhost:3001

2. **Start the Frontend**:
   ```bash
   npm install
   npm run dev
   ```
   Frontend will run on http://localhost:3002

## Usage Example

1. Open http://localhost:3003 in your browser (note: port may vary)
2. Select semester: "Autumn 2025"
3. Enter subject: "CSE" (will automatically load available courses)
4. Select course from dropdown: "2421"
5. Click "Search Course"

The system will display all available sections with:

- Class numbers
- Section types (L = Lecture, B = Lab, etc.)
- Meeting times and days
- Room locations
- Current enrollment vs capacity
- Waitlist information

### Smart Course Selection

When you change the subject (e.g., from CSE to MATH), the course dropdown automatically updates to show only courses available for that subject in the selected semester. If no courses are available, you can still manually enter a course number.

## API Endpoints

### Search Courses

```
GET /api/courses/search?semester=autumn%202025&subject=CSE&courseNumber=2421
```

**Response**:

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
      "capacity": "40"
    }
  ]
}
```

### Get All Subjects

```
GET /api/courses/subjects
```

### Get Available Courses (NEW)

```
GET /api/courses/courses?semester=autumn%202025&subject=CSE
```

**Response**:

```json
{
  "semester": "autumn 2025",
  "subject": "CSE",
  "courses": ["1110", "1111", "1211", "2421", "2431", ...]
}
```

This endpoint returns all course numbers available for a specific subject and semester, used to populate the course selection dropdown.

## Technical Details

### Data Source

- Scrapes data from: https://www.asc.ohio-state.edu/barrett.3/schedule/
- Parses text-based schedule files (e.g., `1258.txt` for Autumn 2025)
- Extracts structured data from OSU's raw schedule format

### Semester Mapping

- Autumn 2025 → `1258.txt`
- Spring 2025 → `1252.txt`
- Summer 2025 → `1254.txt`

### Error Handling

- Invalid course numbers return 404 with descriptive error
- Network errors are caught and displayed to users
- Missing parameters return 400 with validation messages

## Development

### Server Development

```bash
cd server
npm run dev  # Auto-restart on file changes
```

### Frontend Development

```bash
npm run dev  # Next.js hot reloading
```

### Project Structure

```
├── app/                    # Next.js frontend
│   ├── page.tsx           # Main course search interface
│   ├── page.module.css    # Component styles
│   └── ...
├── server/                # Express.js backend
│   ├── src/
│   │   ├── app.ts         # Server entry point
│   │   ├── controllers/   # Request handlers
│   │   ├── routes/        # API routes
│   │   └── services/      # Business logic & scraping
│   └── ...
└── README.md
```

## Available Scripts

### Frontend

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Backend

- `npm run dev` - Start development server with auto-restart
- `npm run build` - Compile TypeScript
- `npm start` - Start production server

## Browser Compatibility

- Modern browsers with ES6+ support
- Responsive design for mobile and desktop
- Dark mode support based on system preferences
