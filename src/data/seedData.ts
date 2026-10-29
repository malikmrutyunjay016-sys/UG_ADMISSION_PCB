import { MeritRecord, VacancySeat } from '../types/admission';

// Default merit records are empty so the system starts clean for real admissions
export const INITIAL_MERIT_RECORDS: MeritRecord[] = [];

export const VACANCY_DATA: VacancySeat[] = [
  { stream: 'Science', subject: 'Physics', totalSeats: 48, admittedSeats: 0, vacantSeats: 48, cutoffPercentage: 0 },
  { stream: 'Science', subject: 'Chemistry', totalSeats: 48, admittedSeats: 0, vacantSeats: 48, cutoffPercentage: 0 },
  { stream: 'Science', subject: 'Mathematics', totalSeats: 48, admittedSeats: 0, vacantSeats: 48, cutoffPercentage: 0 },
  { stream: 'Science', subject: 'Botany', totalSeats: 32, admittedSeats: 0, vacantSeats: 32, cutoffPercentage: 0 },
  { stream: 'Science', subject: 'Zoology', totalSeats: 32, admittedSeats: 0, vacantSeats: 32, cutoffPercentage: 0 },
  { stream: 'Science', subject: 'Computer Science', totalSeats: 32, admittedSeats: 0, vacantSeats: 32, cutoffPercentage: 0 },
  { stream: 'Arts', subject: 'Political Science', totalSeats: 64, admittedSeats: 0, vacantSeats: 64, cutoffPercentage: 0 },
  { stream: 'Arts', subject: 'Economics', totalSeats: 48, admittedSeats: 0, vacantSeats: 48, cutoffPercentage: 0 },
  { stream: 'Arts', subject: 'History', totalSeats: 64, admittedSeats: 0, vacantSeats: 64, cutoffPercentage: 0 },
  { stream: 'Arts', subject: 'English', totalSeats: 32, admittedSeats: 0, vacantSeats: 32, cutoffPercentage: 0 },
  { stream: 'Commerce', subject: 'Accountancy', totalSeats: 128, admittedSeats: 0, vacantSeats: 128, cutoffPercentage: 0 },
  { stream: 'Commerce', subject: 'Financial Management', totalSeats: 64, admittedSeats: 0, vacantSeats: 64, cutoffPercentage: 0 },
];
