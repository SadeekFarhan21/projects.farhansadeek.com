import { Request, Response } from 'express';
import { OSUScraper } from '../services/osuScraper';

export class CourseController {
  private scraper = new OSUScraper();

  getSubjects = async (req: Request, res: Response) => {
    try {
      const subjects = await this.scraper.getSubjects();
      res.json({ subjects });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch subjects' });
    }
  };

  getCoursesBySubject = async (req: Request, res: Response) => {
    try {
      const { subject } = req.params;
      const data = await this.scraper.getCourseData(subject);
      res.json({ subject, data });
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch courses for ${req.params.subject}` });
    }
  };

  getSpecificCourse = async (req: Request, res: Response) => {
    try {
      const { subject, courseFile } = req.params;
      const data = await this.scraper.getSpecificCourse(subject, courseFile);
      res.json({ subject, courseFile, data });
    } catch (error) {
      res.status(500).json({ error: `Failed to fetch ${req.params.subject}/${req.params.courseFile}` });
    }
  };

  searchCourse = async (req: Request, res: Response) => {
    try {
      const { semester, subject, courseNumber } = req.query;

      if (!semester || !subject || !courseNumber) {
        return res.status(400).json({ 
          error: 'Missing required parameters: semester, subject, and courseNumber' 
        });
      }

      const courseInfo = await this.scraper.getCourseInfo(
        semester as string, 
        subject as string, 
        courseNumber as string
      );

      if (!courseInfo) {
        return res.status(404).json({ 
          error: `Course ${subject} ${courseNumber} not found for ${semester}` 
        });
      }

      res.json(courseInfo);
    } catch (error) {
      res.status(500).json({ 
        error: `Failed to search for course: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };

  getAvailableCourses = async (req: Request, res: Response) => {
    try {
      const { semester, subject } = req.query;

      if (!semester || !subject) {
        return res.status(400).json({ 
          error: 'Missing required parameters: semester and subject' 
        });
      }

      const courses = await this.scraper.getAvailableCourses(
        semester as string, 
        subject as string
      );

      res.json({ semester, subject, courses });
    } catch (error) {
      res.status(500).json({ 
        error: `Failed to get available courses: ${error instanceof Error ? error.message : 'Unknown error'}` 
      });
    }
  };
}
