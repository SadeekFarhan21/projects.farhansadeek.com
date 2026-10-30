import axios from 'axios';

export interface CourseSection {
  courseNumber: string;
  classNumber: string;
  type: string; // L = Lecture, B = Lab, etc.
  days?: string;
  time?: string;
  location?: string;
  enrolled: string;
  capacity: string;
  waitlist?: string;
  instructor?: string;
}

export interface CourseInfo {
  subject: string;
  courseNumber: string;
  semester: string;
  sections: CourseSection[];
}

export class OSUScraper {
  private baseUrl = 'https://www.asc.ohio-state.edu/barrett.3/schedule';
  
  async getSubjects(): Promise<string[]> {
    return [
      'ACADAFF', 'ACCAD', 'ACCTMIS', 'ACEL', 'AEDECON', 'AEE', 'AEROENG', 
      'AFAMAST', 'AGRCOMM', 'AGSYSMGT', 'AGSYSMT', 'AIRSCI', 'ALLIMED', 
      'ANATOMY', 'ANESTHES', 'ANIMSCI', 'ANMLTEC', 'ANTHROP', 'ARABIC', 
      'ARCH', 'ART', 'ARTEDUC', 'ARTSCOL', 'ARTSSCI', 'ASE', 'ASL', 
      'ASTRON', 'ATHTRNG', 'ATMOSSC', 'AVIATION', 'AVIATN', 'BCS', 
      'BIOCHEM', 'BIOCHEMP', 'BIOETHC', 'BIOLOGY', 'BIOMEDE', 'BIOMINF', 
      'BIOMSCI', 'BIOPHRM', 'BIOPHYS', 'BIOSCI', 'BIOSTAT', 'BIOTECH', 
      'BIOWMGT', 'BMEA', 'BMI', 'BSGP', 'BUSADM', 'BUSFIN', 'BUSMGT', 
      'BUSMHR', 'BUSML', 'BUSOBA', 'BUSTEC', 'CATALAN', 'CBE', 'CBG', 
      'CHBE', 'CHEM', 'CHEMPHY', 'CHINESE', 'CIRTECH', 'CIVILEN', 'CLAS', 
      'CLASSICS', 'CLLC', 'COMLDR', 'COMM', 'COMPSTD', 'CONSCI', 'CONSYSM', 
      'CONSYSMT', 'CRPLAN', 'CRPSOIL', 'CSCFFS', 'CSCFMFNS', 'CSE', 
      'CSFMRSM', 'CSFRST', 'CSFSNRTS', 'CSHSPMG', 'CSTW', 'CSTXTCL', 
      'CZECH', 'DANCE', 'DENT', 'DENTHYG', 'DESIGN', 'DNE', 'DSABLST', 
      'EALL', 'EARTHSC', 'EARTHSCI', 'ECE', 'ECON', 'EDUCST', 'EDUPAES', 
      'EDUPL', 'EDUTL', 'EEOB', 'EEURLL', 'EHE', 'EMERGMED', 'ENGINEER', 
      'ENGLISH', 'ENGR', 'ENGRAPH', 'ENGREDU', 'ENGRTEC', 'ENGTECH', 
      'ENR', 'ENTMLGY', 'ENTOMOL', 'ENVENG', 'ENVSCI', 'ENVSCT', 'ESCE', 
      'ESCFE', 'ESEADM', 'ESEPHL', 'ESEPOL', 'ESEPSY', 'ESETEC', 'ESHESA', 
      'ESLTECH', 'ESPHE', 'ESQREM', 'ESQUAL', 'ESSPED', 'ESSPSY', 'ESTEPL', 
      'ESWDE', 'EXP', 'EXPLORNG', 'FABENG', 'FAES', 'FCSED', 'FDSCTE', 
      'FILMSTD', 'FMRESM', 'FRENCH', 'FRIT', 'GENBIOL', 'GENCHEM', 'GENCOMM', 
      'GENED', 'GENHUM', 'GENMATH', 'GENSSC', 'GENSTDS', 'GEODSCIE', 
      'GEODSCIM', 'GEOG', 'GEORGIAN', 'GEOSCIM', 'GERMAN', 'GRADSCH', 
      'GRADTDA', 'GREEK', 'HCINNOV', 'HCS', 'HDFS', 'HEBREW', 'HECCREG', 
      'HIMS', 'HINDI', 'HISTART', 'HISTORY', 'HONORS', 'HORTTEC', 'HOSPMGT', 
      'HSMP', 'HTHRHSC', 'HUMANEC', 'HUMCOL', 'HUMNNTR', 'HUNGARIN', 
      'HUNGRN', 'HW', 'HWIH', 'IBGP', 'INDENG', 'INTMED', 'INTSTDS', 
      'ISE', 'ISLAM', 'ITALIAN', 'JAPANESE', 'JAPANSE', 'JEWSHST', 'KINESIO', 
      'KNHES', 'KNOW', 'KNPE', 'KNSFHP', 'KNSISM', 'KOREAN', 'LABBIOSC', 
      'LARCH', 'LATIN', 'LAW', 'LING', 'LINGUIST', 'MATH', 'MATSCEN', 
      'MBA', 'MCDBIO', 'MCR', 'MDN', 'MDRNGRK', 'MEATSCI', 'MECHENG', 
      'MEDCOLL', 'MEDDIET', 'MEDIEVAL', 'MEDLBS', 'MEDMCIM', 'MEDREN', 
      'MEDTECH', 'MICRBIO', 'MICRBIOL', 'MILSCI', 'MOLBIOC', 'MOLBIOCH', 
      'MOLGEN', 'MPSCOL', 'MUSIC', 'MVIMG', 'MVNGIMG', 'NAVALSC', 'NELC', 
      'NEURO', 'NEUROGS', 'NEUROGSP', 'NEUROSC', 'NEURSGY', 'NRSADVN', 
      'NRSPRCT', 'NUCLREN', 'NURSING', 'NURSPRCT', 'OCCTHER', 'OPTHLMOL', 
      'OPTOM', 'OPTOMTRY', 'ORIENTAT', 'OSBP', 'OTOLARN', 'OTOLARYN', 
      'PATHOL', 'PDATRICS', 'PEDS', 'PERSIAN', 'PHARMACY', 'PHARMCL', 
      'PHARMCOL', 'PHILOS', 'PHR', 'PHYSICS', 'PHYSIO', 'PHYSIOCB', 
      'PHYSMED', 'PHYSTHER', 'PHYSTHR', 'PLNTBIO', 'PLNTPTH', 'POLISH', 
      'POLITSC', 'PORTGESE', 'PORTGSE', 'PSYBHLH', 'PSYCH', 'PSYCHTRY', 
      'PUBAFRS', 'PUBHBIO', 'PUBHEHS', 'PUBHEPI', 'PUBHHBP', 'PUBHHMP', 
      'PUBHLTH', 'PUBPOLM', 'QUECHUA', 'RADIOLG', 'RADIOLGY', 'RADSCI', 
      'RELSTDS', 'RESPTHER', 'RESPTHR', 'RNEWNRG', 'ROMANIA', 'ROMANIAN', 
      'ROMLING', 'ROOM', 'RURLSOC', 'RUSSIAN', 'SANSKRIT', 'SANSKRT', 
      'SASIA', 'SBSCOL', 'SCANDNAV', 'SCANDVN', 'SCHOLAR', 'SLAVIC', 
      'SOCIOL', 'SOCWORK', 'SOMALI', 'SPANISH', 'SPHHRNG', 'SRBCROA', 
      'STAT', 'STEP', 'SUMMARY', 'SURGERY', 'SWAHILI', 'SWEDISH', 'SXLTYST', 
      'TECPHYS', 'THEATRE', 'TIBETAN', 'TURKISH', 'TXTLCLO', 'URDU', 
      'USAS', 'UZBEK', 'VETBIOS', 'VETCLIN', 'VETPREV', 'VISSCI', 'VMCOLL', 
      'VOCEDUC', 'WELDENG', 'WGSST', 'WOMSTDS', 'YIDDISH', 'YORUBA', 'ZULU'
    ];
  }

  async getCourseData(subject: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/${subject}/`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data for ${subject}`);
    }
  }

  async getSpecificCourse(subject: string, courseFile: string): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/${subject}/${courseFile}`);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch ${subject}/${courseFile}`);
    }
  }

  async getCourseInfo(semester: string, subject: string, courseNumber: string): Promise<CourseInfo | null> {
    try {
      // For now, we'll use 1258.txt as the data file for Autumn 2025
      // In a real implementation, you might need to determine the correct file based on semester
      const semesterCode = this.getSemesterCode(semester);
      const response = await axios.get(`${this.baseUrl}/${subject}/${semesterCode}.txt`);
      const data = response.data;
      
      const courseInfo = this.parseCourseData(data, subject, courseNumber, semester);
      return courseInfo;
    } catch (error) {
      throw new Error(`Failed to fetch course ${subject} ${courseNumber} for ${semester}`);
    }
  }

  async getAvailableCourses(semester: string, subject: string): Promise<string[]> {
    try {
      const semesterCode = this.getSemesterCode(semester);
      const response = await axios.get(`${this.baseUrl}/${subject}/${semesterCode}.txt`);
      const data = response.data;
      
      const courseNumbers = new Set<string>();
      const lines = data.split('\n');
      
      for (const line of lines) {
        // Look for lines that start with the subject code followed by a course number
        const coursePattern = new RegExp(`^\\s*${subject}\\s+(\\d+)`, 'i');
        const match = line.match(coursePattern);
        if (match) {
          courseNumbers.add(match[1]);
        }
      }
      
      return Array.from(courseNumbers).sort((a, b) => parseInt(a) - parseInt(b));
    } catch (error) {
      throw new Error(`Failed to fetch available courses for ${subject} in ${semester}`);
    }
  }

  private getSemesterCode(semester: string): string {
    // Map semester to file code - you may need to adjust this mapping
    const semesterMap: Record<string, string> = {
      'autumn 2025': '1258',
      'fall 2025': '1258',
      'spring 2025': '1252',
      'summer 2025': '1254'
    };
    
    return semesterMap[semester.toLowerCase()] || '1258';
  }

  private parseCourseData(data: string, subject: string, courseNumber: string, semester: string): CourseInfo | null {
    const lines = data.split('\n');
    const sections: CourseSection[] = [];
    let foundCourse = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for the specific course number
      const coursePattern = new RegExp(`\\b${subject}\\s+${courseNumber}\\b`, 'i');
      if (coursePattern.test(line)) {
        foundCourse = true;
        
        // Parse this line and potentially subsequent lines for section info
        const section = this.parseCourseLine(line);
        if (section) {
          section.courseNumber = courseNumber;
          sections.push(section);
        }
      } else if (foundCourse) {
        // Check if this line continues with the same course
        const continuePattern = new RegExp(`^\\s*${subject}\\s+${courseNumber}\\b`, 'i');
        if (continuePattern.test(line)) {
          const section = this.parseCourseLine(line);
          if (section) {
            section.courseNumber = courseNumber;
            sections.push(section);
          }
        } else if (line.includes(subject) && !line.includes(courseNumber)) {
          // We've moved to a different course, stop parsing
          break;
        }
      }
    }

    if (sections.length === 0) {
      return null;
    }

    return {
      subject,
      courseNumber,
      semester,
      sections
    };
  }

  private parseCourseLine(line: string): CourseSection | null {
    try {
      // Parse the course line format
      // Example: "CSE 2421            36158 L                  TWRF    1020A       HI0306      40/40"
      
      const parts = line.split(/\s+/).filter(part => part.length > 0);
      if (parts.length < 4) return null;

      let classNumber = '';
      let type = '';
      let days = '';
      let time = '';
      let location = '';
      let enrollmentInfo = '';

      // Find class number (should be numeric)
      for (let i = 2; i < parts.length; i++) {
        if (/^\d+$/.test(parts[i])) {
          classNumber = parts[i];
          if (i + 1 < parts.length) {
            type = parts[i + 1];
          }
          break;
        }
      }

      // Look for enrollment info (format like "40/40" or "40/40 +3")
      for (let i = parts.length - 1; i >= 0; i--) {
        if (/^\d+\/\d+/.test(parts[i])) {
          enrollmentInfo = parts[i];
          // Check if there's a waitlist number after
          if (i + 1 < parts.length && parts[i + 1].startsWith('+')) {
            enrollmentInfo += ' ' + parts[i + 1];
          }
          break;
        }
      }

      // Parse enrollment info
      const enrollmentMatch = enrollmentInfo.match(/(\d+)\/(\d+)(?:\s*\+(\d+))?/);
      const enrolled = enrollmentMatch ? enrollmentMatch[1] : '';
      const capacity = enrollmentMatch ? enrollmentMatch[2] : '';
      const waitlist = enrollmentMatch && enrollmentMatch[3] ? enrollmentMatch[3] : '';

      // Try to find time and location patterns
      for (let i = 0; i < parts.length; i++) {
        // Time pattern (like "1020A", "0150P")
        if (/^\d{3,4}[AP]$/.test(parts[i])) {
          time = parts[i];
        }
        // Days pattern (like "TWRF", "M W F")
        if (/^[MTWRF]+$/.test(parts[i]) || (parts[i].length === 1 && /[MTWRF]/.test(parts[i]))) {
          days = parts[i];
        }
        // Location pattern (like "HI0306", "ONLINE")
        if (/^[A-Z]{2,}\d+$/.test(parts[i]) || parts[i] === 'ONLINE') {
          location = parts[i];
        }
      }

      return {
        courseNumber: '', // Will be set by caller
        classNumber,
        type,
        days: days || undefined,
        time: time || undefined,
        location: location || undefined,
        enrolled,
        capacity,
        waitlist: waitlist || undefined
      };
    } catch (error) {
      return null;
    }
  }
}
