import { motion } from "framer-motion";
import { AlertTriangle, Globe, Timer, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Department, EmployeeStatus } from "@/types/employee";
import { formatTime } from "@/utils/formatTime";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, onSnapshot, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StatusCardProps {
  employeeStatus: EmployeeStatus;
  clockInTimer: string;
  breakTimer: string;
  accumulatedBreakMs: number;
  currentDepartment: Department | null;
  isLate: boolean;
  lateMinutes: number;
  isOvertime: boolean;
  overtimeMinutes: number;
  onClockIn: () => void;
  onClockOut: () => void;
  onToggleBreak: (breakType: string) => void;
  onResumeWorking: () => void;
  onToggleStandby: () => void;
  getStatusColor: (status: string) => string;
  getBreakButtonState: (breakType: string) => { visible: boolean; active: boolean; disabled: boolean };
}

const formatScheduleTime = (time: string) => {
  const [hours, minutes] = time.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

export function StatusCard({
  employeeStatus,
  clockInTimer,
  breakTimer,
  accumulatedBreakMs,
  currentDepartment,
  isLate,
  lateMinutes,
  isOvertime,
  overtimeMinutes,
  onClockIn,
  onClockOut,
  onToggleBreak,
  onResumeWorking,
  onToggleStandby,
  getStatusColor,
  getBreakButtonState,
}: StatusCardProps) {
  const [showClockOutConfirmation, setShowClockOutConfirmation] = useState(false);
  const [employeesOnBreak, setEmployeesOnBreak] = useState<Array<{
    id: string;
    name: string;
    status: string;
    bio?: string;
    department?: string;
    departmentName?: string;
  }>>([]);

  useEffect(() => {
    // Subscribe to status changes to show who's on break
    const statusQuery = query(
      collection(db, "status"),
      where("status", "in", ["BIO 1", "BIO 2", "Lunch", "Lunch 2"])
    );

    const unsubscribe = onSnapshot(statusQuery, async (snapshot) => {
      const breakEmployees: Array<{
        id: string;
        name: string;
        status: string;
        bio?: string;
        department?: string;
        departmentName?: string;
      }> = [];

      for (const doc of snapshot.docs) {
        const statusData = doc.data();
        const employeeId = statusData.employeeId;

        // Fetch employee details
        const employeeQuery = query(
          collection(db, "employees"),
          where("employeeId", "==", employeeId)
        );
        const employeeSnapshot = await getDocs(employeeQuery);

        if (!employeeSnapshot.empty) {
          const employeeData = employeeSnapshot.docs[0].data();
          const departmentId = employeeData.department;
          let departmentName = "No department";

          // Fetch department name if department ID exists
          if (departmentId) {
            try {
              const departmentDoc = await getDocs(
                query(collection(db, "departments"), where("id", "==", departmentId))
              );
              
              if (!departmentDoc.empty) {
                departmentName = departmentDoc.docs[0].data().name;
              } else {
                // Try to get department directly by ID
                const deptDocRef = doc(db, "departments", departmentId);
                const deptDoc = await getDoc(deptDocRef);
                if (deptDoc.exists()) {
                  departmentName = deptDoc.data().name;
                }
              }
            } catch (error) {
              console.error("Error fetching department:", error);
            }
          }

          breakEmployees.push({
            id: employeeId,
            name: employeeData.name || "Unknown Employee",
            status: statusData.status,
            bio: employeeData.basicInfo?.bio || "No bio available",
            department: departmentId,
            departmentName: departmentName
          });
        }
      }

      setEmployeesOnBreak(breakEmployees);
    });

    return () => unsubscribe();
  }, []);

  const handleClockOutClick = () => {
    setShowClockOutConfirmation(true);
  };

  const handleConfirmClockOut = () => {
    setShowClockOutConfirmation(false);
    onClockOut();
  };

  return (
    <div className="space-y-6">
      <Card className={`${getStatusColor(employeeStatus.status)} backdrop-blur-md text-white`}>
        <CardHeader className="sm:px-6 px-4 py-4 sm:py-6">
          <div className="flex flex-col space-y-3">
            <CardTitle className="text-xl sm:text-2xl">Status & Controls</CardTitle>
            {currentDepartment && (
              <CardDescription className="text-white/80">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 bg-white/5 rounded-lg p-3 sm:p-4 border border-white/10">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-white/70" />
                    <span className="font-medium">{currentDepartment.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-white/70">Schedule:</span>
                      <span className="font-medium">
                        {formatScheduleTime(currentDepartment.schedule.clockIn)} - {formatScheduleTime(currentDepartment.schedule.clockOut)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-white/70">Grace Period:</span>
                      <span>{currentDepartment.schedule.gracePeriod} minutes</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-white/70">Overtime After:</span>
                      <span>{currentDepartment.schedule.overtimeThreshold} minutes</span>
                    </div>
                  </div>
                </div>
              </CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="sm:px-6 px-4 pb-6">
          <div className="grid gap-4 sm:gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg backdrop-blur-sm"
              >
                <div className="text-sm text-white/70 mb-2">Current Status</div>
                <div className="space-y-2">
                  <Badge 
                    variant={
                      employeeStatus.status === "Clocked Out" ? "outline" : 
                      employeeStatus.status === "Working" ? "default" :
                      employeeStatus.status === "Standby" ? "secondary" :
                      "secondary"
                    }
                    className="text-base sm:text-lg py-1 sm:py-2 px-3 sm:px-4"
                  >
                    {employeeStatus.status}
                  </Badge>
                  {isLate && employeeStatus.status !== "Clocked Out" && (
                    <div className="flex items-center gap-2 mt-3 bg-yellow-500/10 text-yellow-300 p-2 rounded-lg border border-yellow-500/20">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Late by {lateMinutes} minutes</span>
                    </div>
                  )}
                  {isOvertime && (
                    <div className="flex items-center gap-2 mt-2 bg-orange-500/10 text-orange-300 p-2 rounded-lg border border-orange-500/20">
                      <Timer className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Overtime: {overtimeMinutes} minutes</span>
                    </div>
                  )}
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg backdrop-blur-sm"
              >
                <div className="text-sm text-white/70 mb-2">Clock Timer</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-mono">{clockInTimer}</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg backdrop-blur-sm"
              >
                <div className="text-sm text-white/70 mb-2">Break Timer</div>
                <div className="text-xl sm:text-2xl md:text-3xl font-mono">{breakTimer}</div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/5 p-4 sm:p-6 rounded-lg backdrop-blur-sm"
              >
                <div className="text-sm text-white/70 mb-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 flex-shrink-0" />
                    Accumulated Break
                  </div>
                </div>
                <div className="text-xl sm:text-2xl md:text-3xl font-mono">{formatTime(accumulatedBreakMs)}</div>
              </motion.div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 mt-2">
              {employeeStatus.status === "Clocked Out" ? (
                <Button 
                  onClick={onClockIn}
                  className="col-span-full h-12 sm:h-14 text-base sm:text-lg bg-green-500 hover:bg-green-600"
                >
                  Clock In
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={handleClockOutClick}
                    variant="destructive" 
                    className="col-span-full h-12 sm:h-14 text-base sm:text-lg mb-2 sm:mb-3"
                  >
                    Clock Out
                  </Button>

                  {employeeStatus.status === "Working" && (
                    <Button
                      onClick={onToggleStandby}
                      variant="outline"
                      className="col-span-full h-10 sm:h-12 text-white border-white/30 hover:bg-white/10 mb-2 sm:mb-3"
                    >
                      Go to Standby
                    </Button>
                  )}

                  {employeeStatus.status === "Standby" && (
                    <Button
                      onClick={onToggleStandby}
                      variant="outline"
                      className="col-span-full h-10 sm:h-12 bg-white/20 text-white hover:bg-white/30 mb-2 sm:mb-3"
                    >
                      Resume Working
                    </Button>
                  )}

                  <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["Lunch", "BIO 1", "BIO 2", "Lunch 2"].map(breakType => {
                      const { visible, active, disabled } = getBreakButtonState(breakType);
                      if (!visible) return null;
                      return (
                        <Button
                          key={breakType}
                          onClick={() => onToggleBreak(breakType)}
                          variant={active ? "default" : "outline"}
                          disabled={disabled && !active}
                          className={`h-10 sm:h-12 ${
                            active ? 'bg-white/20 text-white' : 'text-white border-white/30'
                          }`}
                        >
                          {active ? `End ${breakType}` : breakType}
                        </Button>
                      );
                    })}
                  </div>

                  {employeeStatus.status === "Working Idle" && (
                    <Button 
                      onClick={onResumeWorking} 
                      className="col-span-full h-10 sm:h-12 bg-white/20 text-white hover:bg-white/30"
                    >
                      Resume Working
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Public display of employees on break */}
      <Card className="bg-white/10 backdrop-blur-md text-white">
        <CardHeader>
          <div className="flex flex-col space-y-3">
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Employees on Break
            </CardTitle>
            <CardDescription className="text-white/80">
              See who's currently on break and their bio information
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {employeesOnBreak.length === 0 ? (
            <div className="text-center py-6 text-white/70">
              No employees are currently on break
            </div>
          ) : (
            <div className="grid gap-4">
              {employeesOnBreak.map((employee) => (
                <motion.div
                  key={employee.id}
                  whileHover={{ scale: 1.01 }}
                  className="bg-white/5 p-4 rounded-lg backdrop-blur-sm border border-white/10"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-lg">{employee.name}</h3>
                      <p className="text-white/70 text-sm">{employee.departmentName || "No department"}</p>
                    </div>
                    <Badge 
                      variant="secondary"
                      className="py-1 px-3"
                    >
                      {employee.status}
                    </Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-white/80 text-sm italic">"{employee.bio}"</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={showClockOutConfirmation} onOpenChange={setShowClockOutConfirmation}>
        <AlertDialogContent className="bg-gray-800 text-white border border-white/20 max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Clock Out Confirmation</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Are you sure you want to clock out? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel className="bg-transparent text-white border-white/20 hover:bg-white/10 mt-0">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClockOut}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Clock Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}