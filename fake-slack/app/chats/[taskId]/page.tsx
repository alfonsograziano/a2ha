"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ContactRequest } from "../../store";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.taskId as string;
  const [contactRequest, setContactRequest] = useState<ContactRequest | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [sending, setSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [messageSent, setMessageSent] = useState(false);

  useEffect(() => {
    fetchContactRequest();
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchContactRequest, 2000);
    return () => clearInterval(interval);
  }, [taskId]);

  const fetchContactRequest = async () => {
    if (!taskId) return;
    
    try {
      const response = await fetch(`/api/contact-requests/${taskId}`);
      if (response.ok) {
        const data = await response.json();
        // Convert timestamp strings back to Date objects
        const contactRequestData = {
          ...data,
          timestamp: new Date(data.timestamp),
          sentMessageTimestamp: data.sentMessageTimestamp ? new Date(data.sentMessageTimestamp) : undefined,
        };
        setContactRequest(contactRequestData);
        
        // If there's a sent message in the store, update local state
        if (contactRequestData.sentMessage) {
          setSentMessage(contactRequestData.sentMessage);
          setMessageSent(true);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error fetching contact request:", response.status, errorData);
        setContactRequest(null);
      }
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contact request:", error);
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!answer.trim() || !taskId || messageSent) return;

    const messageToSend = answer.trim();
    setSending(true);
    try {
      const response = await fetch("http://localhost:4000/webhook/task-updates", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          taskId,
          answer: messageToSend,
        }),
      });

      if (response.ok) {
        // Store the sent message in the backend
        try {
          const storeResponse = await fetch(`/api/contact-requests/${taskId}/sent-message`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: messageToSend,
            }),
          });
          
          if (storeResponse.ok) {
            // Update local state
            setSentMessage(messageToSend);
            setAnswer("");
            setMessageSent(true);
          } else {
            console.error("Failed to store sent message");
            // Still update local state even if storage fails
            setSentMessage(messageToSend);
            setAnswer("");
            setMessageSent(true);
          }
        } catch (storeError) {
          console.error("Error storing sent message:", storeError);
          // Still update local state even if storage fails
          setSentMessage(messageToSend);
          setAnswer("");
          setMessageSent(true);
        }
      } else {
        console.error("Failed to send answer");
      }
    } catch (error) {
      console.error("Error sending answer:", error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!contactRequest) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-500 dark:text-zinc-400 mb-4">
            Contact request not found
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-zinc-200 dark:bg-zinc-800 text-black dark:text-zinc-50 rounded-lg hover:bg-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      <main className="max-w-4xl mx-auto w-full px-4 py-8 flex flex-col flex-1">
        <button
          onClick={() => router.push("/")}
          className="mb-4 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800 flex-1 flex flex-col">
          <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50 mb-2">
              #{contactRequest.taskId}
            </h1>
          </div>

          <div className="p-6 flex-1 overflow-y-auto">
            <div className="space-y-4">
              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      From:
                    </span>
                    <span className="ml-2 text-black dark:text-zinc-50">
                      {contactRequest.from}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      To:
                    </span>
                    <span className="ml-2 text-black dark:text-zinc-50">
                      {contactRequest.to}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      Task ID:
                    </span>
                    <span className="ml-2 text-black dark:text-zinc-50">
                      {contactRequest.taskId}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      Sent:
                    </span>
                    <span className="ml-2 text-black dark:text-zinc-50">
                      {new Date(contactRequest.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <div className="mb-2">
                  <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                    Message:
                  </span>
                </div>
                <p className="text-black dark:text-zinc-50 whitespace-pre-wrap">
                  {contactRequest.message}
                </p>
              </div>

              {sentMessage && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <div className="mb-2">
                    <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                      Your Reply:
                    </span>
                  </div>
                  <p className="text-black dark:text-zinc-50 whitespace-pre-wrap">
                    {sentMessage}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 border-t border-zinc-200 dark:border-zinc-800">
            {messageSent ? (
              <div className="text-center py-2">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 italic">
                  Message sent. Only one reply is allowed per contact request.
                </p>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your answer..."
                  disabled={sending || messageSent}
                  className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={!answer.trim() || sending || messageSent}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 disabled:hover:bg-zinc-300 dark:disabled:bg-zinc-700 dark:disabled:hover:bg-zinc-700 text-white rounded-lg transition-colors flex items-center justify-center disabled:cursor-not-allowed"
                  aria-label="Send"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

