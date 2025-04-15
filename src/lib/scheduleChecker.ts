import { collection, query, where, getDocs, doc, updateDoc, Timestamp, deleteDoc, addDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Department, Employee, EmployeeStatus } from '@/types/employee';

export async function checkAndUpdateDepartmentStatus() {
  try {
    // Get all departments
    const departmentsSnapshot = await getDocs(collection(db, "departments"));
    const departments: Department[] = [];
    departmentsSnapshot.forEach((doc) => {
      departments.push({ id: doc.id, ...doc.data() } as Department);
    });

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    // Check each department's schedule
    for (const department of departments) {
      if (currentTime === department.schedule.clockIn) {
        // Get all employees in this department
        const employeesQuery = query(
          collection(db, "employees"),
          where("department", "==", department.id)
        );
        const employeesSnapshot = await getDocs(employeesQuery);

        // Update each employee's status
        employeesSnapshot.forEach(async (employeeDoc) => {
          const employee = employeeDoc.data() as Employee;
          const statusRef = doc(db, "status", employee.employeeId);

          try {
            const timestamp = Timestamp.now();
            const newStatus: Partial<EmployeeStatus> = {
              status: "Working",
              stateStartTime: timestamp,
              lastTimerUpdate: timestamp
            };
            await updateDoc(statusRef, newStatus);
          } catch (error) {
            console.error(`Error updating status for employee ${employee.employeeId}:`, error);
          }
        });
      }

      // Check if it's time to clock out employees
      if (currentTime === department.schedule.clockOut) {
        // Get all employees in this department
        const employeesQuery = query(
          collection(db, "employees"),
          where("department", "==", department.id)
        );
        const employeesSnapshot = await getDocs(employeesQuery);

        // Clock out each employee
        employeesSnapshot.forEach(async (employeeDoc) => {
          const employee = employeeDoc.data() as Employee;
          const statusRef = doc(db, "status", employee.employeeId);

          try {
            // Get the current status of the employee
            const statusDoc = await getDoc(statusRef);

            if (statusDoc.exists()) {
              const currentStatus = statusDoc.data() as EmployeeStatus;
              const now = Timestamp.now();

              // Only clock out if the employee is not already clocked out
              if (currentStatus.status !== "Clocked Out") {
                // Check if there's already a clock-out record for today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);

                const existingClockOutQuery = query(
                  collection(db, "attendance"),
                  where("employeeId", "==", employee.employeeId),
                  where("eventType", "==", "clockOut"),
                  where("timestamp", ">=", Timestamp.fromDate(today)),
                  where("timestamp", "<", Timestamp.fromDate(tomorrow))
                );

                const existingClockOutDocs = await getDocs(existingClockOutQuery);
                if (existingClockOutDocs.empty) {
                  // Calculate accumulated break time
                  let accumulatedBreakMs = 0;
                  const storedBreak = localStorage.getItem(`accumulatedBreak_${employee.employeeId}`);
                  if (storedBreak) {
                    accumulatedBreakMs = parseInt(storedBreak, 10);
                  }

                  // Calculate if employee is late or overtime
                  let isLate = false;
                  let lateMinutes = 0;
                  let isOvertime = false;
                  let overtimeMinutes = 0;

                  const storedLateStatus = localStorage.getItem(`lateStatus_${employee.employeeId}`);
                  if (storedLateStatus) {
                    const lateStatus = JSON.parse(storedLateStatus);
                    if (lateStatus.date === new Date().toDateString()) {
                      isLate = lateStatus.isLate;
                      lateMinutes = lateStatus.lateMinutes;
                    }
                  }

                  // Calculate total clock time
                  const clockInTime = currentStatus.clockInTime?.toDate() || currentStatus.stateStartTime?.toDate();
                  const totalClockTime = clockInTime ? now.toDate().getTime() - clockInTime.getTime() : 0;

                  // Check if overtime
                  const [scheduleEndHour, scheduleEndMinute] = department.schedule.clockOut.split(':');
                  const scheduleEndTime = new Date();
                  scheduleEndTime.setHours(parseInt(scheduleEndHour), parseInt(scheduleEndMinute), 0, 0);

                  const [scheduleStartHour, scheduleStartMinute] = department.schedule.clockIn.split(':');
                  const scheduleStartTime = new Date();
                  scheduleStartTime.setHours(parseInt(scheduleStartHour), parseInt(scheduleStartMinute), 0, 0);

                  const scheduledWorkMs = scheduleEndTime.getTime() - scheduleStartTime.getTime();
                  const overtimeMs = totalClockTime - scheduledWorkMs - accumulatedBreakMs;

                  if (overtimeMs > department.schedule.overtimeThreshold * 60 * 1000) {
                    isOvertime = true;
                    overtimeMinutes = Math.floor(overtimeMs / (60 * 1000));
                  }

                  // Create attendance record
                  const attendanceRecord = {
                    employeeId: employee.employeeId,
                    eventType: "clockOut",
                    timestamp: now,
                    clockInTime: currentStatus.clockInTime || currentStatus.stateStartTime,
                    clockOutTime: now,
                    totalClockTime,
                    accumulatedBreak: accumulatedBreakMs,
                    isLate,
                    lateMinutes,
                    isOvertime,
                    overtimeMinutes,
                    department: employee.department || null,
                    autoClockOut: true,
                    date: now
                  };

                  // Add attendance record
                  await addDoc(collection(db, "attendance"), attendanceRecord);

                  // Add to attendance summary
                  await addDoc(collection(db, "attendanceSummary"), {
                    ...attendanceRecord,
                    date: now
                  });

                  // Delete status (clock out)
                  await deleteDoc(statusRef);

                  // Clean up local storage
                  localStorage.removeItem(`accumulatedBreak_${employee.employeeId}`);
                  localStorage.removeItem(`lateStatus_${employee.employeeId}`);

                  console.log(`Auto clocked out employee: ${employee.name} (${employee.employeeId})`);
                }
              }
            }
          } catch (error) {
            console.error(`Error auto clocking out employee ${employee.employeeId}:`, error);
          }
        });
      }
    }
  } catch (error) {
    console.error("Error in schedule checker:", error);
  }
}