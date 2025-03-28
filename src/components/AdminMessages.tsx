import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Message } from "@/types/employee";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare, Send, User, Users, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

interface AdminMessagesProps {
  messages: Message[];
  employees: { id: string; name: string; employeeId: string }[];
  onMessageSent: () => void;
}

interface ConversationGroup {
  employeeId: string;
  employeeName: string;
  messages: Message[];
  unreadCount: number;
}

const AdminMessages = ({ messages, employees, onMessageSent }: AdminMessagesProps) => {
  const [newMessage, setNewMessage] = useState({
    sender: "Admin",
    message: "",
    recipientId: "all_employees",
    timestamp: Timestamp.now(),
    read: false,
  });
  const [activeTab, setActiveTab] = useState("compose");
  const [conversations, setConversations] = useState<ConversationGroup[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [allEmployeesMessages, setAllEmployeesMessages] = useState<Message[]>([]);
  const [localMessages, setLocalMessages] = useState<Message[]>([]);

  // Use both props messages and local messages
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  useEffect(() => {
    // Group messages by recipient
    const groupedConversations: ConversationGroup[] = [];
    
    // Process messages for individual employees
    employees.forEach(employee => {
      const employeeMessages = localMessages.filter(
        msg => msg.recipientId === employee.employeeId || 
              (msg.sender !== "Admin" && msg.sender === employee.name)
      );
      
      if (employeeMessages.length > 0) {
        const unreadCount = employeeMessages.filter(
          msg => msg.sender !== "Admin" && (msg.read === false)
        ).length;
        
        groupedConversations.push({
          employeeId: employee.employeeId,
          employeeName: employee.name,
          messages: employeeMessages.sort((a, b) => 
            (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
          ),
          unreadCount
        });
      }
    });
    
    // Process messages for all employees
    const broadcastMessages = localMessages.filter(msg => msg.recipientId === "all_employees");
    setAllEmployeesMessages(broadcastMessages.sort((a, b) => 
      (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0)
    ));
    
    // Sort conversations by latest message
    groupedConversations.sort((a, b) => {
      const aLatest = a.messages[a.messages.length - 1].timestamp?.seconds || 0;
      const bLatest = b.messages[b.messages.length - 1].timestamp?.seconds || 0;
      return bLatest - aLatest;
    });
    
    setConversations(groupedConversations);
  }, [localMessages, employees]);

  const handleMessageInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewMessage(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleRecipientChange = (value: string) => {
    setNewMessage(prev => ({
      ...prev,
      recipientId: value,
    }));
  };

  const handleCreateMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.message.trim()) return;
    
    try {
      // Create message object with current timestamp
      const timestamp = Timestamp.now();
      const messageToSend = {
        ...newMessage,
        recipientId: newMessage.recipientId === "all" ? "all_employees" : newMessage.recipientId,
        timestamp: timestamp,
        read: false,
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "messages"), messageToSend);
      
      // Add to local state immediately for UI update
      const localMessageCopy = {
        ...messageToSend,
        id: docRef.id,
      } as Message;
      
      setLocalMessages(prev => [...prev, localMessageCopy]);
      
      // Reset form
      setNewMessage({
        sender: "Admin",
        message: "",
        recipientId: newMessage.recipientId, // Keep the same recipient for convenience
        timestamp: Timestamp.now(),
        read: false,
      });
      
      // If in conversation view, switch to the conversation with this recipient
      if (messageToSend.recipientId !== "all_employees" && messageToSend.recipientId !== "all") {
        setSelectedEmployee(messageToSend.recipientId);
        setActiveTab("conversations");
      }
      
      // Notify parent component
      onMessageSent();
    } catch (error) {
      console.error("Error creating message:", error);
    }
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployee(employeeId);
    setActiveTab("conversations");
  };

  const renderMessageItem = (message: Message, index: number) => (
    <motion.div
      key={message.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.05 }}
      className={`p-4 rounded-lg ${
        message.sender === "Admin" 
          ? "bg-blue-500/10 border-blue-500/30 ml-8 mr-2" 
          : "bg-purple-500/10 border-purple-500/30 ml-2 mr-8"
      } border mb-3`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full ${
            message.sender === "Admin" 
              ? "bg-blue-500/20" 
              : "bg-purple-500/20"
          } flex items-center justify-center`}>
            {message.sender === "Admin" 
              ? <MessageSquare className="w-4 h-4 text-blue-300" /> 
              : <User className="w-4 h-4 text-purple-300" />
            }
          </div>
          <span className="font-medium text-white">{message.sender}</span>
        </div>
        <span className="text-sm text-white/50">
          {message.timestamp?.toDate().toLocaleString()}
        </span>
      </div>
      <p className="mt-2 text-white/90 ml-10">{message.message}</p>
      {message.reply && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 ml-10 p-3 bg-white/10 rounded-lg"
        >
          <div className="flex items-center gap-2">
            <p className="text-sm text-white/70">Reply:</p>
            <span className="font-medium text-white/90">{message.reply.message}</span>
          </div>
          <span className="text-xs text-white/50">
            {message.reply.timestamp.toDate().toLocaleString()}
          </span>
        </motion.div>
      )}
    </motion.div>
  );

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          Manage Messages
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-2 gap-1 bg-black/10 p-1 rounded-lg backdrop-blur-md mb-4">
            <TabsTrigger value="compose" className="data-[state=active]:bg-white/20 text-white">
              <Send className="w-4 h-4 mr-2" />
              Compose Message
            </TabsTrigger>
            <TabsTrigger value="conversations" className="data-[state=active]:bg-white/20 text-white">
              <Users className="w-4 h-4 mr-2" />
              Conversations
              {conversations.reduce((total, conv) => total + conv.unreadCount, 0) > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {conversations.reduce((total, conv) => total + conv.unreadCount, 0)}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <form onSubmit={handleCreateMessage} className="grid gap-4">
              <Select
                value={newMessage.recipientId}
                onValueChange={handleRecipientChange}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue placeholder="Select recipient" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_employees">All Employees</SelectItem>
                  {employees.map(emp => (
                    <SelectItem key={emp.employeeId} value={emp.employeeId}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <textarea
                name="message"
                placeholder="Message"
                value={newMessage.message}
                onChange={handleMessageInputChange}
                className="flex h-20 w-full rounded-md border bg-white/10 border-white/20 px-3 py-2 text-base text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 md:text-sm"
              />
              
              <Button 
                type="submit" 
                className="bg-white/20 hover:bg-white/30 text-white border-0"
                disabled={!newMessage.message.trim()}
              >
                <Send className="w-4 h-4 mr-2" />
                Send Message
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="conversations">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-lg border border-white/10 p-2 md:col-span-1">
                <div className="font-medium text-white p-2 border-b border-white/10 mb-2 flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Employee Conversations
                </div>
                <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1">
                  <div 
                    className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                      selectedEmployee === "all_employees" ? "bg-white/20" : "hover:bg-white/10"
                    }`}
                    onClick={() => setSelectedEmployee("all_employees")}
                  >
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-white/70" />
                      <span className="text-white">All Employees</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/50" />
                  </div>
                  
                  {conversations.map(conv => (
                    <div 
                      key={conv.employeeId}
                      className={`p-2 rounded cursor-pointer flex items-center justify-between ${
                        selectedEmployee === conv.employeeId ? "bg-white/20" : "hover:bg-white/10"
                      }`}
                      onClick={() => setSelectedEmployee(conv.employeeId)}
                    >
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2 text-white/70" />
                        <span className="text-white">{conv.employeeName}</span>
                      </div>
                      <div className="flex items-center">
                        {conv.unreadCount > 0 && (
                          <Badge variant="destructive" className="mr-2">
                            {conv.unreadCount}
                          </Badge>
                        )}
                        <ChevronRight className="w-4 h-4 text-white/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-white/5 rounded-lg border border-white/10 p-4 md:col-span-2 max-h-[600px] overflow-y-auto">
                {selectedEmployee ? (
                  <>
                    <div className="font-medium text-white mb-4 pb-2 border-b border-white/10">
                      {selectedEmployee === "all_employees" ? (
                        <div className="flex items-center">
                          <Users className="w-5 h-5 mr-2" />
                          <span>All Employees Broadcast</span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <User className="w-5 h-5 mr-2" />
                          <span>
                            {employees.find(emp => emp.employeeId === selectedEmployee)?.name || "Employee"}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <AnimatePresence>
                      {selectedEmployee === "all_employees" ? (
                        allEmployeesMessages.length > 0 ? (
                          allEmployeesMessages.map((message, index) => renderMessageItem(message, index))
                        ) : (
                          <div className="text-center text-white/50 py-8">
                            No broadcast messages found
                          </div>
                        )
                      ) : (
                        conversations.find(c => c.employeeId === selectedEmployee)?.messages.map((message, index) => 
                          renderMessageItem(message, index)
                        ) || (
                          <div className="text-center text-white/50 py-8">
                            No conversation history found
                          </div>
                        )
                      )}
                    </AnimatePresence>
                    
                    {selectedEmployee !== "all_employees" && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <form 
                          onSubmit={(e) => {
                            e.preventDefault();
                            if (newMessage.message.trim()) {
                              setNewMessage(prev => ({
                                ...prev,
                                recipientId: selectedEmployee || "all_employees"
                              }));
                              handleCreateMessage(e);
                            }
                          }}
                          className="flex gap-2"
                        >
                          <textarea
                            name="message"
                            placeholder={`Message to ${
                              employees.find(emp => emp.employeeId === selectedEmployee)?.name || "Employee"
                            }...`}
                            value={newMessage.message}
                            onChange={handleMessageInputChange}
                            className="flex h-12 w-full rounded-md border bg-white/10 border-white/20 px-3 py-2 text-base text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 md:text-sm"
                          />
                          
                          <Button 
                            type="submit" 
                            className="bg-white/20 hover:bg-white/30 text-white border-0 h-12"
                            disabled={!newMessage.message.trim()}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                        </form>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center text-white/50 py-8">
                    Select a conversation from the list
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminMessages;