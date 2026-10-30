'use client';

import { useState, useEffect } from 'react';
import styles from "./page.module.css";

interface CourseSection {
  courseNumber: string;
  classNumber: string;
  type: string;
  days?: string;
  time?: string;
  location?: string;
  enrolled: string;
  capacity: string;
  waitlist?: string;
  instructor?: string;
}

interface CourseInfo {
  subject: string;
  courseNumber: string;
  semester: string;
  sections: CourseSection[];
}

export default function Home() {
  const [semester, setSemester] = useState('autumn 2025');
  const [subject, setSubject] = useState('CSE');
  const [courseNumber, setCourseNumber] = useState('2421');
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
  const [availableCourses, setAvailableCourses] = useState<string[]>([]);
  const [courseData, setCourseData] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAvailableSubjects = async () => {
    setLoadingSubjects(true);
    try {
      const response = await fetch('http://localhost:3001/api/courses/subjects');

      if (response.ok) {
        const data = await response.json();
        setAvailableSubjects(data.subjects || []);
      } else {
        setAvailableSubjects([]);
      }
    } catch (err) {
      console.error('Failed to fetch available subjects:', err);
      setAvailableSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const fetchAvailableCourses = async (currentSemester: string, currentSubject: string) => {
    if (!currentSubject.trim()) {
      setAvailableCourses([]);
      return;
    }

    setLoadingCourses(true);
    try {
      const response = await fetch(
        `http://localhost:3001/api/courses/courses?semester=${encodeURIComponent(currentSemester)}&subject=${encodeURIComponent(currentSubject)}`
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableCourses(data.courses || []);

        // If current course number is not in the list, reset it to the first available
        if (data.courses && data.courses.length > 0 && !data.courses.includes(courseNumber)) {
          setCourseNumber(data.courses[0]);
        }
      } else {
        setAvailableCourses([]);
      }
    } catch (err) {
      console.error('Failed to fetch available courses:', err);
      setAvailableCourses([]);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleSubjectChange = (newSubject: string) => {
    setSubject(newSubject.toUpperCase());
    if (newSubject.trim()) {
      fetchAvailableCourses(semester, newSubject.toUpperCase());
    } else {
      setAvailableCourses([]);
    }
  };

  const handleSemesterChange = (newSemester: string) => {
    setSemester(newSemester);
    if (subject.trim()) {
      fetchAvailableCourses(newSemester, subject);
    }
  };

  // Load subjects and courses when component mounts
  useEffect(() => {
    fetchAvailableSubjects();
    if (subject.trim()) {
      fetchAvailableCourses(semester, subject);
    }
  }, []); // Empty dependency array means this runs once on mount

  const searchCourse = async () => {
    setLoading(true);
    setError(null);
    setCourseData(null);

    try {
      const response = await fetch(
        `http://localhost:3001/api/courses/search?semester=${encodeURIComponent(semester)}&subject=${encodeURIComponent(subject)}&courseNumber=${encodeURIComponent(courseNumber)}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch course data');
      }

      const data = await response.json();
      setCourseData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (time?: string) => {
    if (!time) return 'TBA';
    if (time.endsWith('A')) {
      return time.slice(0, -1) + ' AM';
    } else if (time.endsWith('P')) {
      return time.slice(0, -1) + ' PM';
    }
    return time;
  };

  const formatDays = (days?: string) => {
    if (!days) return 'TBA';
    return days.split('').join(' ');
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.header}>
          <h1 className={styles.title}>Ohio State Course Search</h1>
          <p className={styles.subtitle}>Search for course sections and enrollment information</p>
        </div>

        <div className={styles.searchForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="semester">Semester:</label>
            <select
              id="semester"
              value={semester}
              onChange={(e) => handleSemesterChange(e.target.value)}
              className={styles.select}
            >
              <option value="autumn 2025">Autumn 2025</option>
              <option value="spring 2025">Spring 2025</option>
              <option value="summer 2025">Summer 2025</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="subject">Subject:</label>
            {loadingSubjects ? (
              <div className={styles.loadingCourses}>Loading subjects...</div>
            ) : availableSubjects.length > 0 ? (
              <select
                id="subject"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                className={styles.select}
              >
                {availableSubjects.map((subj) => (
                  <option key={subj} value={subj}>
                    {subj}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => handleSubjectChange(e.target.value)}
                placeholder="e.g., CSE"
                className={styles.input}
              />
            )}
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="courseNumber">Course Number:</label>
            {loadingCourses ? (
              <div className={styles.loadingCourses}>Loading courses...</div>
            ) : availableCourses.length > 0 ? (
              <select
                id="courseNumber"
                value={courseNumber}
                onChange={(e) => setCourseNumber(e.target.value)}
                className={styles.select}
              >
                {availableCourses.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="courseNumber"
                type="text"
                value={courseNumber}
                onChange={(e) => setCourseNumber(e.target.value)}
                placeholder="e.g., 2421"
                className={styles.input}
              />
            )}
          </div>

          <button
            onClick={searchCourse}
            disabled={loading}
            className={styles.searchButton}
          >
            {loading ? 'Searching...' : 'Search Course'}
          </button>
        </div>

        {error && (
          <div className={styles.error}>
            <p>Error: {error}</p>
          </div>
        )}

        {courseData && (
          <div className={styles.results}>
            <h2 className={styles.courseTitle}>
              {courseData.subject} {courseData.courseNumber} - {courseData.semester}
            </h2>
            <p className={styles.sectionCount}>
              Found {courseData.sections.length} section{courseData.sections.length !== 1 ? 's' : ''}
            </p>

            <div className={styles.sectionsGrid}>
              {courseData.sections.map((section, index) => (
                <div key={index} className={styles.sectionCard}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.classNumber}>Class #{section.classNumber}</span>
                    <span className={styles.sectionType}>{section.type}</span>
                  </div>

                  <div className={styles.sectionDetails}>
                    <div className={styles.detailRow}>
                      <span className={styles.label}>Time:</span>
                      <span>{formatDays(section.days)} {formatTime(section.time)}</span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.label}>Location:</span>
                      <span>{section.location || 'TBA'}</span>
                    </div>

                    <div className={styles.detailRow}>
                      <span className={styles.label}>Enrollment:</span>
                      <span className={styles.enrollment}>
                        {section.enrolled}/{section.capacity}
                        {section.waitlist && (
                          <span className={styles.waitlist}> (+{section.waitlist} waitlisted)</span>
                        )}
                      </span>
                    </div>

                    {section.instructor && (
                      <div className={styles.detailRow}>
                        <span className={styles.label}>Instructor:</span>
                        <span>{section.instructor}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}