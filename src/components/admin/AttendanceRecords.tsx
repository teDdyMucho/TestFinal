import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Employee } from "@/types/employee";
import { motion } from "framer-motion";
import { Clock, User, RefreshCw, Search } from "lucide-react";

interface AttendanceRecordsProps {
  employees: Employee[];
  departments: { id: string; name: string }[];
  onViewAttendance: (employee: Employee) => void;
  onRefresh: () => void;
}

const AttendanceRecords = ({ 
  employees, 
  departments,
  onViewAttendance, 
  onRefresh 
}: AttendanceRecordsProps) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredEmployees = employees
    .filter(emp => selectedDepartment === "all" || emp.department === selectedDepartment)
    .filter(emp => 
      searchQuery === "" || 
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleEmployeeClick = (employee: Employee) => {
    onViewAttendance(employee);
  };

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-md text-white">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-6 h-6" />
          Attendance Records
        </CardTitle>
        <div className="flex items-center gap-4">
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="bg-white/10 border-white/20 text-white rounded-md px-3 py-1"
          >
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="text-white hover:bg-white/20"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-white/50" />
          </div>
          <Input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/10 border-white/20 text-white placeholder:text-white/50 pl-10"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => (
            <motion.button
              key={employee.id}
              whileHover={{ scale: 1.01 }}
              onClick={() => handleEmployeeClick(employee)}
              className="bg-white/5 p-4 rounded-lg cursor-pointer text-left w-full transition-colors hover:bg-white/10"
            >
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-white/70" />
                <div>
                  <div className="font-medium">{employee.name}</div>
                  <div className="text-sm text-white/70">
                    {employee.employeeId}
                    {employee.department && (
                      <span className="ml-2">
                        • {departments.find(d => d.id === employee.department)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AttendanceRecords;