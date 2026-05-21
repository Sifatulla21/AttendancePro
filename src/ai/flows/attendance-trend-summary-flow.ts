'use server';
/**
 * @fileOverview A Genkit flow for generating a summary of attendance trends.
 *
 * - attendanceTrendSummary - A function that handles the attendance trend summary process.
 * - AttendanceTrendSummaryInput - The input type for the attendanceTrendSummary function.
 * - AttendanceTrendSummaryOutput - The return type for the attendanceTrendSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AttendanceTrendSummaryInputSchema = z.object({
  classId: z.string().describe('The ID of the class.'),
  month: z.number().min(1).max(12).describe('The month number (1-12).'),
  year: z.number().describe('The year.'),
  studentRoll: z.number().optional().describe('Optional student roll number to filter trends for a specific student.'),
});
export type AttendanceTrendSummaryInput = z.infer<typeof AttendanceTrendSummaryInputSchema>;

const AttendanceTrendSummaryOutputSchema = z.object({
  summary: z.string().describe('An AI-generated summary of attendance trends.'),
  predictedDropOff: z.boolean().optional().describe('Indicates if a potential attendance drop-off is predicted for the student or class.'),
});
export type AttendanceTrendSummaryOutput = z.infer<typeof AttendanceTrendSummaryOutputSchema>;

// Helper function to simulate attendance data (in a real app, this would fetch from a database)
function simulateAttendanceData(input: AttendanceTrendSummaryInput): string {
  const {classId, month, year, studentRoll} = input;
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const selectedMonthName = monthNames[month - 1];

  let data = `Attendance records for Class ID: ${classId}, Month: ${selectedMonthName} ${year}`;
  if (studentRoll) {
    data += `, Student Roll: ${studentRoll}`;
  }
  data += '.\n\n';

  // Generate some sample data for a few days
  const daysInMonth = new Date(year, month, 0).getDate();
  const students = studentRoll ? [studentRoll] : [201, 202, 203, 204]; // Simulate students
  const attendanceStatus = ['Present', 'Absent'];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    // Skip weekends for more realistic trend analysis
    if (date.getDay() === 0 || date.getDay() === 6) { // Sunday or Saturday
      continue;
    }
    data += `Date: ${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}\n`;
    for (const roll of students) {
      // Introduce some patterns: e.g., student 202 is often absent on Mondays
      let status = attendanceStatus[Math.floor(Math.random() * attendanceStatus.length)];
      if (roll === 202 && date.getDay() === 1) { // Monday
        status = 'Absent';
      }
      if (roll === 201 && day > daysInMonth / 2 && Math.random() < 0.4) { // student 201 has more absences later in the month
        status = 'Absent';
      }
      data += `  Student ${roll}: ${status}\n`;
    }
    data += '\n';
  }
  return data;
}

const attendanceTrendSummaryPrompt = ai.definePrompt({
  name: 'attendanceTrendSummaryPrompt',
  input: {schema: z.object({attendanceData: z.string()})}, // The prompt expects pre-formatted attendance data
  output: {schema: AttendanceTrendSummaryOutputSchema},
  prompt: `You are an AI assistant specialized in analyzing student attendance trends.\nYour task is to analyze the provided attendance data and generate a concise summary highlighting:\n1.  Overall attendance patterns for the selected period (month and/or specific student).\n2.  Any frequent absence days (e.g., "often absent on Mondays").\n3.  Recent changes in attendance behavior (e.g., "attendance has declined in the latter half of the month").\n4.  Predict if there's a potential attendance drop-off, setting 'predictedDropOff' to true if identified, otherwise false.\n\nProvide the summary in a structured JSON format according to the output schema.\n\nAttendance Data:\n{{{attendanceData}}}`,
});

const attendanceTrendSummaryFlow = ai.defineFlow(
  {
    name: 'attendanceTrendSummaryFlow',
    inputSchema: AttendanceTrendSummaryInputSchema,
    outputSchema: AttendanceTrendSummaryOutputSchema,
  },
  async (input) => {
    // In a real application, this is where you would query your database for attendance records
    // based on input.classId, input.month, input.year, and input.studentRoll.
    // For this example, we simulate the data.
    const attendanceData = simulateAttendanceData(input);

    const {output} = await attendanceTrendSummaryPrompt({attendanceData});
    return output!;
  }
);

export async function attendanceTrendSummary(input: AttendanceTrendSummaryInput): Promise<AttendanceTrendSummaryOutput> {
  return attendanceTrendSummaryFlow(input);
}
