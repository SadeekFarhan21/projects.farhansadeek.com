import { Router } from 'express';
import { CourseController } from '../controllers/courseController';

const router = Router();
const courseController = new CourseController();

router.get('/subjects', courseController.getSubjects);
router.get('/courses', courseController.getAvailableCourses);
router.get('/search', courseController.searchCourse);
router.get('/:subject', courseController.getCoursesBySubject);
router.get('/:subject/:courseFile', courseController.getSpecificCourse);

export { router as courseRoutes };
