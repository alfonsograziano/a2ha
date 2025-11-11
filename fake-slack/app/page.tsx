"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ContactRequest } from "./store";

export default function Home() {
  const [contactRequests, setContactRequests] = useState<ContactRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContactRequests();
    // Poll for new requests every 2 seconds
    const interval = setInterval(fetchContactRequests, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchContactRequests = async () => {
    try {
      const response = await fetch("/api/contact-requests");
      const data = await response.json();
      // Convert timestamp strings back to Date objects and sort by timestamp, newest first
      const requests = data.map((req: any) => ({
        ...req,
        timestamp: new Date(req.timestamp),
      }));
      const sorted = requests.sort(
        (a: ContactRequest, b: ContactRequest) =>
          b.timestamp.getTime() - a.timestamp.getTime()
      );
      setContactRequests(sorted);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching contact requests:", error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-4">
            Fake Slack
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            This is a fake mini Slack application which is used to showcase the
            capabilities of the A2HA agent.
          </p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-sm border border-zinc-200 dark:border-zinc-800">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
              Contact Requests
            </h2>
            {loading ? (
              <p className="text-zinc-500 dark:text-zinc-400">Loading...</p>
            ) : contactRequests.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">
                No contact requests yet.
              </p>
            ) : (
              <div className="space-y-2">
                {contactRequests.map((request) => (
                  <Link
                    key={request.taskId}
                    href={`/chats/${request.taskId}`}
                    className="block p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-black dark:text-zinc-50">
                          #{request.taskId}
                        </span>
                        <span className="text-zinc-500 dark:text-zinc-400 ml-2">
                          → {request.to}
                        </span>
                      </div>
                      <span className="text-sm text-zinc-400 dark:text-zinc-500">
                        {new Date(request.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
