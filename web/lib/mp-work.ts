import { getMemberAttendance } from "./attendance";
import { getLocalMemberDebates } from "./parliamentary-debates";
import { getMemberQuestions } from "./parliamentary-work-local";
import { attendanceForProfile, debatesForProfile, questionsForProfile, type ProfileWork } from "./profile-model";

// A sitting MP's record in Parliament, from the local Digital Sansad archives: attendance, questions and
// debates. MP pages and the 2024 winner's candidate page both draw it from here, so they always match.
export function mpWorkRecords(memberId: number, day: (iso: string) => string) {
  const questions = getMemberQuestions(memberId);
  const attendance = getMemberAttendance(memberId);
  const debates = getLocalMemberDebates(memberId);
  const missing = [...(attendance ? [] : ["attendance"]), ...(questions ? [] : ["questions"]), ...(debates ? [] : ["debates"])];
  const work: Pick<ProfileWork, "attendance" | "questions" | "debates"> = {
    ...(attendance ? { attendance: attendanceForProfile(attendance, day) } : {}),
    ...(questions?.questions.length ? { questions: questionsForProfile(questions, day) } : {}),
    ...(debates?.totalRecords ? { debates: debatesForProfile(debates, day) } : {}),
  };
  return {
    work,
    found: Boolean(questions || attendance || debates),
    missing,
    // Ministers and the Speaker answer questions rather than ask them, so an empty list is not neglect.
    noQuestions: Boolean(questions && !questions.questions.length),
    sources: [
      ...(attendance ? [{ title: "Member attendance, Digital Sansad", url: attendance.sourceUrl, checkedOn: day(attendance.collectedAt) }] : []),
      ...(debates ? [{ title: "Debates, Digital Sansad", url: debates.directoryUrl, checkedOn: day(debates.collectedOn) }] : []),
    ],
  };
}

export const NO_QUESTIONS_NOTE = "No questions are listed under this member's name. Ministers and the Speaker answer questions in the House rather than ask them.";
export const WORK_NOTE = "A question or debate record shows the MP raised a matter. It does not show that a project was delivered.";

// "attendance, questions and debates"
export const joinList = (items: string[]) => (items.length > 1 ? `${items.slice(0, -1).join(", ")} and ${items.at(-1)}` : items[0] ?? "");

// "Attendance and debates for this MP are not collected yet."
export function missingNote(missing: string[]) {
  if (!missing.length) return undefined;
  const text = joinList(missing);
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} for this MP are not collected yet.`;
}
