import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Message } from "@/types/employee";
import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Reply, Send, X, Bell } from "lucide-react";

interface EmployeeMessagesProps {
  employeeId: string;
  employeeName: string;
}

const EmployeeMessages = ({ employeeId, employeeName }: EmployeeMessagesProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [showUnreadOnly, setShowUnreadOnly] = useState<boolean>(false);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 10000);
    return () => clearInterval(interval);
  }, [employeeId, showUnreadOnly]);

  const fetchMessages = async () => {
    try {
      const q = query(
        collection(db, "messages"),
        where("recipientId", "in", [employeeId, ""])
      );
      const querySnapshot = await getDocs(q);
      const msgs: Message[] = [];
      let unread = 0;
      
      querySnapshot.forEach(docSnapshot => {
        const messageData = docSnapshot.data();
        if (!messageData.read) {
          unread++;
        }
        
        // Only add unread messages if the filter is active
        if (!showUnreadOnly || !messageData.read) {
          msgs.push({
            ...messageData,
            id: docSnapshot.id
          } as Message);
        }
      });
      
      msgs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      setMessages(msgs);
      setUnreadCount(unread);
      
      // Mark unread messages as read when they are viewed
      msgs.forEach(async (message) => {
        if (!message.read) {
          const messageRef = doc(db, "messages", message.id);
          await updateDoc(messageRef, {
            read: true
          });
        }
      });
    } catch (error) {
      console.error("Fetch messages error:", error);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) return;

    try {
      const messageRef = doc(db, "messages", messageId);
      await updateDoc(messageRef, {
        reply: {
          sender: employeeName,
          message: replyText,
          timestamp: Timestamp.now()
        },
        read: true
      });
      setReplyText("");
      setReplyingTo(null);
      fetchMessages();
    } catch (error) {
      console.error("Error replying to message:", error);
    }
  };

  const toggleUnreadFilter = () => {
    setShowUnreadOnly(!showUnreadOnly);
  };

  return (
    <Card className="glassmorphism">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Messages
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <Button 
            variant={showUnreadOnly ? "default" : "outline"} 
            size="sm" 
            onClick={toggleUnreadFilter}
            className={`${showUnreadOnly ? 'bg-white/20' : 'border-white/20'} text-white hover:bg-white/30`}
          >
            <Bell className="w-4 h-4 mr-2" />
            {showUnreadOnly ? "Show All" : "Show Unread"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <motion.div 
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <AnimatePresence>
            {messages.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center p-6 text-white/70"
              >
                {showUnreadOnly ? "No unread messages" : "No messages found"}
              </motion.div>
            ) : (
              messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                  className={`border ${!message.read ? 'border-blue-400/50 bg-blue-900/10' : 'border-white/20 bg-white/5'} rounded-lg p-4`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{message.sender}</span>
                      {!message.read && (
                        <Badge variant="secondary" className="bg-blue-500/20 text-blue-200">
                          New
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-white/50">
                      {message.timestamp?.toDate().toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-2 text-white/90">{message.message}</p>
                  
                  {message.reply ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 ml-4 p-3 bg-white/10 rounded-lg"
                    >
                      <p className="text-sm text-white/70">Your reply:</p>
                      <p className="mt-1 text-white">{message.reply.message}</p>
                      <span className="text-xs text-white/50">
                        {message.reply.timestamp.toDate().toLocaleString()}
                      </span>
                    </motion.div>
                  ) : (
                    <div className="mt-3">
                      {replyingTo === message.id ? (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Type your reply..."
                            className="w-full p-2 rounded-md bg-white/10 border-white/20 text-white placeholder:text-white/50"
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => handleReply(message.id)}
                              className="bg-white/20 hover:bg-white/30 text-white border-0"
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Send Reply
                            </Button>
                            <Button 
                              variant="outline" 
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText("");
                              }}
                              className="border-white/20 text-white hover:bg-white/10"
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setReplyingTo(message.id)}
                          className="border-white/20 text-white hover:bg-white/10"
                        >
                          <Reply className="w-4 h-4 mr-2" />
                          Reply
                        </Button>
                      )}
                    </div>
                  )}
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </CardContent>
    </Card>
  );
};

export default EmployeeMessages;