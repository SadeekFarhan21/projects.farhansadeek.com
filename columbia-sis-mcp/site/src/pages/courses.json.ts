import courses from '../data/courses.json';

export function GET() {
  return new Response(JSON.stringify(courses), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
