import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  deleteDoc,
  updateDoc,
  addDoc,
  Timestamp,
  onSnapshot,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EmployeeStatus, AttendanceRecord, Department } from "@/types/employee";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Clock, History, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "./employee/Header";
import { StatusCard } from "./employee/StatusCard";
import { AttendanceSummaryCard } from "./employee/AttendanceSummaryCard";
import { HistoryCard } from "./employee/HistoryCard";
import EmployeeMessages from "./EmployeeMessages";
import { formatTime } from "@/utils/formatTime";
import { checkAndUpdateDepartmentStatus } from '@/lib/scheduleChecker';
import { Badge } from "@/components/ui/badge";

interface LateStatus {
  isLate: boolean;
  lateMinutes: number;
  date: string;
}

const EmployeePanel = () => {
  const storedEmployee = localStorage.getItem("currentEmployee");
  const initialEmployee = storedEmployee ? JSON.parse(storedEmployee) : null;
  const [employeeStatus, setEmployeeStatus] = useState<EmployeeStatus>({ status: "Clocked Out", stateStartTime: null });
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [clockInTimer, setClockInTimer] = useState("00:00:00");
  const [breakTimer, setBreakTimer] = useState("00:00:00");
  const [accumulatedBreakMs, setAccumulatedBreakMs] = useState(() => {
    if (initialEmployee?.employeeId) {
      const stored = localStorage.getItem(`accumulatedBreak_${initialEmployee.employeeId}`);
      return stored ? parseInt(stored, 10) : 0;
    }
    return 0;
  });
  const [currentBreakStartTime, setCurrentBreakStartTime] = useState<Date | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [attendanceSummaries, setAttendanceSummaries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentDepartment, setCurrentDepartment] = useState<Department | null>(null);
  const [isLate, setIsLate] = useState(false);
  const [lateMinutes, setLateMinutes] = useState(0);
  const [isOvertime, setIsOvertime] = useState(false);
  const [overtimeMinutes, setOvertimeMinutes] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const audioRef2 = useRef<HTMLAudioElement>(null);
  const statusUnsubscribeRef = useRef<(() => void) | undefined>();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Add sound interval effect
  useEffect(() => {
    let soundInterval: NodeJS.Timeout;

    if (employeeStatus.status !== "Clocked Out" && employeeStatus.status !== "Working") {
      soundInterval = setInterval(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(console.error);
        }
      }, 3000); // Play sound every 3 seconds
    }

    return () => {
      if (soundInterval) {
        clearInterval(soundInterval);
      }
    };
  }, [employeeStatus.status]);

  useEffect(() => {
    if (initialEmployee?.employeeId) {
      localStorage.setItem(
        `accumulatedBreak_${initialEmployee.employeeId}`, 
        accumulatedBreakMs.toString()
      );
    }
  }, [accumulatedBreakMs, initialEmployee?.employeeId]);

  useEffect(() => {
    if (initialEmployee?.employeeId) {
      const storedLateStatus = localStorage.getItem(`lateStatus_${initialEmployee.employeeId}`);
      if (storedLateStatus) {
        const lateStatus: LateStatus = JSON.parse(storedLateStatus);
        const today = new Date().toDateString();
        
        if (lateStatus.date === today) {
          setIsLate(lateStatus.isLate);
          setLateMinutes(lateStatus.lateMinutes);
        } else {
          localStorage.removeItem(`lateStatus_${initialEmployee.employeeId}`);
        }
      }
    }
  }, [initialEmployee?.employeeId]);

  const isWithinSchedule = useCallback(() => {
    if (!currentDepartment) return true;

    const now = new Date();
    const [startHour, startMinute] = currentDepartment.schedule.clockIn.split(':');
    const [endHour, endMinute] = currentDepartment.schedule.clockOut.split(':');
    
    const scheduleStart = new Date();
    scheduleStart.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
    
    const scheduleEnd = new Date();
    scheduleEnd.setHours(parseInt(endHour), parseInt(endMinute), 0, 0);
    
    return now >= scheduleStart && now <= scheduleEnd;
  }, [currentDepartment]);

  const handleLogout = useCallback(() => {
    if (statusUnsubscribeRef.current) {
      statusUnsubscribeRef.current();
    }
    localStorage.removeItem("currentEmployee");
    navigate("/");
  }, [navigate]);

  const clockIn = async () => {
    if (!initialEmployee?.employeeId) return;
    
    const now = Timestamp.now();
    setClockInTime(now.toDate());
    try {
      await addDoc(collection(db, "attendance"), {
        employeeId: initialEmployee.employeeId,
        eventType: "clockIn",
        timestamp: now
      });
      
      const initialStatus = isWithinSchedule() ? "Working" : "Standby";
      const newStatus = { 
        status: initialStatus, 
        stateStartTime: now,
        employeeId: initialEmployee.employeeId,
        clockInTime: now
      };
      await setDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
      setEmployeeStatus(newStatus);
      
      if (currentDepartment) {
        const [scheduleHour, scheduleMinute] = currentDepartment.schedule.clockIn.split(':');
        const scheduleTime = new Date();
        scheduleTime.setHours(parseInt(scheduleHour), parseInt(scheduleMinute), 0, 0);
        
        const clockInMs = now.toDate().getTime();
        const scheduleMs = scheduleTime.getTime();
        const diffMinutes = Math.floor((clockInMs - scheduleMs) / (1000 * 60));
        
        if (diffMinutes > currentDepartment.schedule.gracePeriod) {
          const lateStatus: LateStatus = {
            isLate: true,
            lateMinutes: diffMinutes,
            date: new Date().toDateString()
          };
          localStorage.setItem(`lateStatus_${initialEmployee.employeeId}`, JSON.stringify(lateStatus));
          
          setIsLate(true);
          setLateMinutes(diffMinutes);
          toast({
            title: "Late Clock In",
            description: `You are ${diffMinutes} minutes late`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error("Clock in error:", error);
      toast({
        title: "Error",
        description: "Failed to clock in",
        variant: "destructive",
      });
    }
  };

  const clockOut = async () => {
    if (!initialEmployee?.employeeId) return;
    
    const now = Timestamp.now();
    try {
      if (currentBreakStartTime && employeeStatus.status !== "Working" && employeeStatus.status !== "Clocked Out") {
        const currentBreakTime = Date.now() - currentBreakStartTime.getTime();
        setAccumulatedBreakMs(prev => prev + currentBreakTime);
      }

      const attendanceRecord = {
        employeeId: initialEmployee.employeeId,
        eventType: "clockOut",
        timestamp: now,
        clockInTime: clockInTime ? Timestamp.fromDate(clockInTime) : null,
        clockOutTime: now,
        totalClockTime: clockInTime ? Date.now() - clockInTime.getTime() : 0,
        accumulatedBreak: accumulatedBreakMs,
        isLate,
        lateMinutes,
        isOvertime,
        overtimeMinutes,
        department: initialEmployee.department || null
      };

      await addDoc(collection(db, "attendance"), attendanceRecord);
      await addDoc(collection(db, "attendanceSummary"), {
        ...attendanceRecord,
        date: now
      });

      setEmployeeStatus({ status: "Clocked Out", stateStartTime: null });
      await deleteDoc(doc(db, "status", initialEmployee.employeeId));
      setClockInTime(null);
      setClockInTimer("00:00:00");
      setBreakTimer("00:00:00");
      setCurrentBreakStartTime(null);
      
      localStorage.removeItem(`accumulatedBreak_${initialEmployee.employeeId}`);
      setAccumulatedBreakMs(0);
      
      localStorage.removeItem(`lateStatus_${initialEmployee.employeeId}`);
      setIsLate(false);
      setLateMinutes(0);
      
      setIsOvertime(false);
      setOvertimeMinutes(0);

      toast({
        title: "Success",
        description: "Successfully clocked out",
      });
    } catch (error) {
      console.error("Clock out error:", error);
      toast({
        title: "Error",
        description: "Failed to clock out",
        variant: "destructive",
      });
    }
  };

  const toggleBreak = async (breakType: string) => {
    if (!initialEmployee?.employeeId || !clockInTime) return;
    
    const now = Timestamp.now();
    try {
      if (employeeStatus.status === "Working") {
        setBreakTimer("00:00:00");
        await addDoc(collection(db, "attendance"), {
          employeeId: initialEmployee.employeeId,
          eventType: "start_" + breakType.replace(/ /g, ""),
          timestamp: now
        });
        const newStatus = { 
          status: breakType, 
          stateStartTime: now,
          employeeId: initialEmployee.employeeId,
          clockInTime: Timestamp.fromDate(clockInTime)
        };
        await updateDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
        setEmployeeStatus(newStatus);
        setCurrentBreakStartTime(now.toDate());
      } else if (employeeStatus.status === breakType) {
        if (currentBreakStartTime) {
          const currentBreakTime = Date.now() - currentBreakStartTime.getTime();
          setAccumulatedBreakMs(prev => prev + currentBreakTime);
        }
        
        await addDoc(collection(db, "attendance"), {
          employeeId: initialEmployee.employeeId,
          eventType: "end_" + breakType.replace(/ /g, ""),
          timestamp: now
        });
        const newStatus = { 
          status: isWithinSchedule() ? "Working" : "Standby", 
          stateStartTime: now,
          employeeId: initialEmployee.employeeId,
          clockInTime: Timestamp.fromDate(clockInTime)
        };
        await updateDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
        setEmployeeStatus(newStatus);
        setCurrentBreakStartTime(null);
      }
    } catch (error) {
      console.error("Toggle break error:", error);
      toast({
        title: "Error",
        description: "Failed to toggle break status",
        variant: "destructive",
      });
    }
  };

  const toggleStandby = async () => {
    if (!initialEmployee?.employeeId || !clockInTime) return;
    
    const now = Timestamp.now();
    try {
      if (employeeStatus.status === "Working") {
        await addDoc(collection(db, "attendance"), {
          employeeId: initialEmployee.employeeId,
          eventType: "start_standby",
          timestamp: now
        });
        const newStatus = { 
          status: "Standby", 
          stateStartTime: now,
          employeeId: initialEmployee.employeeId,
          clockInTime: Timestamp.fromDate(clockInTime)
        };
        await updateDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
        setEmployeeStatus(newStatus);
      } else if (employeeStatus.status === "Standby") {
        await addDoc(collection(db, "attendance"), {
          employeeId: initialEmployee.employeeId,
          eventType: "end_standby",
          timestamp: now
        });
        const newStatus = { 
          status: "Working", 
          stateStartTime: now,
          employeeId: initialEmployee.employeeId,
          clockInTime: Timestamp.fromDate(clockInTime)
        };
        await updateDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
        setEmployeeStatus(newStatus);
      }
    } catch (error) {
      console.error("Toggle standby error:", error);
      toast({
        title: "Error",
        description: "Failed to toggle standby status",
        variant: "destructive",
      });
    }
  };

  const resumeWorking = async () => {
    if (!initialEmployee?.employeeId || !clockInTime) return;
    
    const now = Timestamp.now();
    try {
      await addDoc(collection(db, "attendance"), {
        employeeId: initialEmployee.employeeId,
        eventType: "resumeWorking",
        timestamp: now
      });
      const newStatus = {
        status: isWithinSchedule() ? "Working" : "Standby",
        stateStartTime: now,
        employeeId: initialEmployee.employeeId,
        clockInTime: Timestamp.fromDate(clockInTime)
      };
      await updateDoc(doc(db, "status", initialEmployee.employeeId), newStatus);
      setEmployeeStatus(newStatus);
    } catch (error) {
      console.error("Resume working error:", error);
      toast({
        title: "Error",
        description: "Failed to resume working",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "Working":
        return "bg-green-500/10 border-green-500/30";
      case "Working Idle":
        return "bg-red-500/10 border-red-500/30";
      case "Standby":
        return "bg-purple-500/10 border-purple-500/30";
      case "Lunch":
      case "Lunch 2":
        return "bg-blue-500/10 border-blue-500/30";
      case "BIO 1":
      case "BIO 2":
        return "bg-red-500/10 border-red-500/30";
      default:
        return "bg-white/5 border-white/20";
    }
  };

  const getBreakButtonState = (breakType: string) => {
    if (employeeStatus.status === "Clocked Out" || employeeStatus.status === "Standby") {
      return { visible: false, active: false, disabled: true };
    }
    if (employeeStatus.status === "Working") {
      return { visible: true, active: false, disabled: false };
    }
    return { 
      visible: true, 
      active: employeeStatus.status === breakType,
      disabled: employeeStatus.status !== breakType
    };
  };

  const fetchAttendanceSummaries = async () => {
    if (!initialEmployee?.employeeId) return;
    
    setIsLoading(true);
    try {
      const q = query(
        collection(db, "attendanceSummary"),
        where("employeeId", "==", initialEmployee.employeeId)
      );
      const querySnapshot = await getDocs(q);
      const summaries: any[] = [];
      querySnapshot.forEach((doc) => {
        summaries.push({
          id: doc.id,
          ...doc.data()
        });
      });
      summaries.sort((a, b) => b.date.seconds - a.date.seconds);
      setAttendanceSummaries(summaries);
      
      toast({
        title: "Success",
        description: "Attendance summary refreshed",
        duration: 2000,
      });
    } catch (error) {
      console.error("Error fetching attendance summaries:", error);
      toast({
        title: "Error",
        description: "Failed to refresh attendance summary",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceHistory = useCallback(async () => {
    if (!initialEmployee?.employeeId) return;
    
    try {
      const q = query(
        collection(db, "attendance"), 
        where("employeeId", "==", initialEmployee.employeeId)
      );
      const querySnapshot = await getDocs(q);
      const history: AttendanceRecord[] = [];
      querySnapshot.forEach(doc => {
        history.push({
          id: doc.id,
          ...doc.data()
        } as AttendanceRecord);
      });
      history.sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);
      setAttendanceHistory(history);
    } catch (error) {
      console.error("Fetch attendance history error:", error);
    }
  }, [initialEmployee?.employeeId]);

  useEffect(() => {
    if (!initialEmployee?.employeeId) return;

    const fetchInitialStatus = async () => {
      const statusDoc = await getDoc(doc(db, "status", initialEmployee.employeeId));
      if (statusDoc.exists()) {
        const statusData = statusDoc.data();
        setEmployeeStatus({
          status: statusData.status || "Clocked Out",
          stateStartTime: statusData.stateStartTime || null,
          employeeId: statusData.employeeId,
          clockInTime: statusData.clockInTime
        });
        if (statusData.clockInTime) {
          setClockInTime(statusData.clockInTime.toDate());
        }
        if (statusData.status !== "Working" && statusData.status !== "Clocked Out") {
          setCurrentBreakStartTime(statusData.stateStartTime?.toDate() || null);
        }
      }
    };

    fetchInitialStatus();
    fetchAttendanceHistory();
    fetchAttendanceSummaries();

    const unsubscribe = onSnapshot(
      doc(db, "status", initialEmployee.employeeId),
      (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          if (data.shouldBuzz) {
            if (audioRef.current) {
              audioRef.current.play().catch(console.error);
            }
            updateDoc(doc.ref, { shouldBuzz: false });
            toast({
              title: "Admin Notification",
              description: "The admin has requested your attention",
              duration: 5000,
            });
          }
          
          setEmployeeStatus({
            status: data.status || "Clocked Out",
            stateStartTime: data.stateStartTime || null,
            employeeId: data.employeeId,
            clockInTime: data.clockInTime
          });
          
          if (data.clockInTime) {
            setClockInTime(data.clockInTime.toDate());
          }
        }
      }
    );

    statusUnsubscribeRef.current = unsubscribe;
    return () => unsubscribe();
  }, [initialEmployee?.employeeId]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      if (clockInTime) {
        const diffOverall = now.getTime() - clockInTime.getTime();
        setClockInTimer(formatTime(diffOverall));

        if (currentDepartment && employeeStatus.status === "Working") {
          const [scheduleHour, scheduleMinute] = currentDepartment.schedule.clockOut.split(':');
          const scheduleTime = new Date();
          scheduleTime.setHours(parseInt(scheduleHour), parseInt(scheduleMinute), 0, 0);
          
          const diffMinutes = Math.floor((now.getTime() - scheduleTime.getTime()) / (1000 * 60));
          
          if (diffMinutes > currentDepartment.schedule.overtimeThreshold) {
            setIsOvertime(true);
            setOvertimeMinutes(diffMinutes);
          }
        }
      }
      
      if (
        employeeStatus.status !== "Working" &&
        employeeStatus.status !== "Clocked Out" &&
        currentBreakStartTime
      ) {
        const currentBreak = now.getTime() - currentBreakStartTime.getTime();
        setBreakTimer(formatTime(currentBreak));
      }

      if (employeeStatus.status === "Working" && !isWithinSchedule()) {
        toggleStandby();
      } else if (employeeStatus.status === "Standby" && isWithinSchedule()) {
        toggleStandby();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [clockInTime, employeeStatus, accumulatedBreakMs, currentDepartment, currentBreakStartTime]);

  useEffect(() => {
    const fetchDepartmentInfo = async () => {
      if (!initialEmployee?.department) return;
      
      try {
        const departmentDoc = await getDoc(doc(db, "departments", initialEmployee.department));
        if (departmentDoc.exists()) {
          setCurrentDepartment(departmentDoc.data() as Department);
        }
      } catch (error) {
        console.error("Error fetching department info:", error);
        toast({
          title: "Error",
          description: "Failed to fetch department schedule",
          variant: "destructive",
        });
      }
    };

    fetchDepartmentInfo();
  }, [initialEmployee?.department]);

  useEffect(() => {
    const scheduleInterval = setInterval(() => {
      checkAndUpdateDepartmentStatus();
    }, 60000);

    checkAndUpdateDepartmentStatus();

    return () => clearInterval(scheduleInterval);
  }, []);

  useEffect(() => {
    if (!initialEmployee?.employeeId) return;

    const fetchUnreadMessages = async () => {
      try {
        const q = query(
          collection(db, "messages"),
          where("recipientId", "in", [initialEmployee.employeeId, ""]),
          where("read", "==", false)
        );
        const querySnapshot = await getDocs(q);
        setUnreadMessageCount(querySnapshot.size);
      } catch (error) {
        console.error("Error fetching unread messages:", error);
      }
    };

    fetchUnreadMessages();

    const messagesQuery = query(
      collection(db, "messages"),
      where("recipientId", "in", [initialEmployee.employeeId, ""])
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      let unreadCount = 0;
      snapshot.forEach((doc) => {
        const messageData = doc.data();
        if (!messageData.read) {
          unreadCount++;
        }
      });
      setUnreadMessageCount(unreadCount);
    });

    return () => unsubscribe();
  }, [initialEmployee?.employeeId]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
      <audio ref={audioRef} src="/buzz.wav" />
      <audio ref={audioRef2} src="/buzz2.wav" />
      <div className="relative min-h-screen flex flex-col">
        <Header 
          currentEmployee={initialEmployee} 
          onLogout={handleLogout}
        />

        <main className="flex-1 p-4">
          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="w-full grid grid-cols-4 gap-1 bg-black/10 p-1 rounded-lg backdrop-blur-md">
              <TabsTrigger value="dashboard" className="data-[state=active]:bg-white/20 text-white">
                <Activity className="w-4 h-4 mr-2" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-white/20 text-white">
                <Clock className="w-4 h-4 mr-2" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="messages" className="data-[state=active]:bg-white/20 text-white relative">
                <MessageSquare className="w-4 h-4 mr-2" />
                Messages
                {unreadMessageCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 px-1.5 py-0.5 min-w-[1.5rem] h-5 flex items-center justify-center text-xs"
                  >
                    {unreadMessageCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="history" className="data-[state=active]:bg-white/20 text-white">
                <History className="w-4 h-4 mr-2" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <StatusCard
                employeeStatus={employeeStatus}
                clockInTimer={clockInTimer}
                breakTimer={breakTimer}
                accumulatedBreakMs={accumulatedBreakMs}
                currentDepartment={currentDepartment}
                isLate={isLate}
                lateMinutes={lateMinutes}
                isOvertime={isOvertime}
                overtimeMinutes={overtimeMinutes}
                onClockIn={clockIn}
                onClockOut={clockOut}
                onToggleBreak={toggleBreak}
                onResumeWorking={resumeWorking}
                onToggleStandby={toggleStandby}
                getStatusColor={getStatusColor}
                getBreakButtonState={getBreakButtonState}
              />
            </TabsContent>

            <TabsContent value="attendance">
              <AttendanceSummaryCard
                attendanceSummaries={attendanceSummaries}
                isLoading={isLoading}
                onRefresh={fetchAttendanceSummaries}
              />
            </TabsContent>

            <TabsContent value="messages">
              {initialEmployee && (
                <EmployeeMessages 
                  employeeId={initialEmployee.employeeId}
                  employeeName={initialEmployee.name}
                />
              )}
            </TabsContent>

            <TabsContent value="history">
              <HistoryCard
                attendanceHistory={attendanceHistory}
                onRefresh={fetchAttendanceHistory}
              />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default EmployeePanel;