"use client";

import React, { useState, useEffect } from "react";

// Types
interface Mistake {
  timestamp: string;
  timestamp_seconds: number;
  category: string;
  description: string;
  impact: "Low" | "Medium" | "High";
  players_involved: string[];
  clip_id?: string;
}

interface MistakeAnalysis {
  video_id: string;
  analyzed_at: number;
  total_mistakes: number;
  categories: Record<string, number>;
  mistakes: Mistake[];
}

interface TrainingDrill {
  name: string;
  type: string;
  duration: number;
  setup: {
    area: string;
    equipment: string[];
    players: string;
  };
  execution: string;
  coaching_points: string[];
  progressions: string[];
  success_criteria: string;
}

interface TrainingSession {
  id: string;
  name: string;
  session_title: string;
  duration: number;
  age_group: string;
  focus_areas: string[];
  equipment_needed: string[];
  phases: SessionPhase[];
  key_messages: string[];
  created_at: number;
  scheduled_date?: string;
}

interface SessionPhase {
  phase_name: string;
  duration: number;
  activities: Activity[];
}

interface Activity {
  name: string;
  description: string;
  coaching_points: string[];
}

interface AssistantCoachProps {
  apiBaseUrl: string;
  authToken: string;
}

export default function AssistantCoach({ apiBaseUrl, authToken }: AssistantCoachProps) {
  const [activeTab, setActiveTab] = useState<"mistakes" | "drills" | "sessions">("mistakes");
  const [videos, setVideos] = useState<any[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [mistakeAnalysis, setMistakeAnalysis] = useState<MistakeAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generatedDrills, setGeneratedDrills] = useState<any>(null);
  const [trainingSessions, setTrainingSessions] = useState<TrainingSession[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch videos
  useEffect(() => {
    fetchVideos();
    fetchTrainingSessions();
  }, []);

  // Fetch videos from API
  const fetchVideos = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/videos`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setVideos(data.data?.videos || []);
      }
    } catch (error) {
      console.error("Failed to fetch videos:", error);
    }
  };

  // Fetch training sessions
  const fetchTrainingSessions = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/coaching/sessions`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setTrainingSessions(data.data?.sessions || []);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
    }
  };

  // Fetch mistake analysis for selected video
  const fetchMistakes = async (videoId: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/videos/${videoId}/mistakes`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await response.json();
      if (data.success) {
        setMistakeAnalysis(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch mistakes:", error);
    }
  };

  // Trigger mistake analysis
  const analyzeMistakes = async (videoId: string, teamName: string, opponentName: string) => {
    setAnalyzing(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/videos/${videoId}/analyze-mistakes`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_name: teamName,
          opponent_name: opponentName,
        }),
      });
      const data = await response.json();
      if (data.success) {
        alert(`Analysis started! Job ID: ${data.data.job_id}`);
        // Poll for results
        setTimeout(() => fetchMistakes(videoId), 5000);
      }
    } catch (error) {
      console.error("Failed to analyze video:", error);
      alert("Failed to start analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  // Generate training drills
  const generateDrills = async () => {
    if (!mistakeAnalysis) return;

    setLoading(true);
    try {
      const selectedMistakeData = mistakeAnalysis.mistakes.filter((_, idx) =>
        selectedMistakes.has(idx)
      );

      const response = await fetch(`${apiBaseUrl}/api/v1/coaching/generate-drills`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mistake_data: selectedMistakeData,
          num_drills: 3,
          age_group: "Adult",
          skill_level: "Intermediate",
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Drill generation started! Job ID: ${data.data.job_id}`);
        setActiveTab("drills");
      }
    } catch (error) {
      console.error("Failed to generate drills:", error);
      alert("Failed to generate drills");
    } finally {
      setLoading(false);
    }
  };

  // Generate training session
  const generateSession = async () => {
    if (!mistakeAnalysis) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/coaching/generate-session`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mistakes: mistakeAnalysis.mistakes,
          session_duration: 60,
          age_group: "Adult",
          skill_level: "Intermediate",
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`Session generation started! Job ID: ${data.data.job_id}`);
        setTimeout(() => fetchTrainingSessions(), 5000);
      }
    } catch (error) {
      console.error("Failed to generate session:", error);
      alert("Failed to generate session");
    } finally {
      setLoading(false);
    }
  };

  // Toggle mistake selection
  const toggleMistakeSelection = (index: number) => {
    const newSelection = new Set(selectedMistakes);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    setSelectedMistakes(newSelection);
  };

  // Get category color
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      poor_passing: "bg-yellow-100 text-yellow-800 border-yellow-300",
      defensive_errors: "bg-red-100 text-red-800 border-red-300",
      transition_errors: "bg-orange-100 text-orange-800 border-orange-300",
      set_piece_mistakes: "bg-purple-100 text-purple-800 border-purple-300",
      positioning_issues: "bg-blue-100 text-blue-800 border-blue-300",
    };
    return colors[category] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  // Get impact color
  const getImpactColor = (impact: string): string => {
    const colors: Record<string, string> = {
      High: "bg-red-500 text-white",
      Medium: "bg-yellow-500 text-white",
      Low: "bg-green-500 text-white",
    };
    return colors[impact] || "bg-gray-500 text-white";
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold mb-2">🤖 AI Assistant Coach</h1>
        <p className="text-blue-100">
          Analyze match footage, detect tactical mistakes, and generate AI-powered training sessions
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("mistakes")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "mistakes"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📹 Mistake Analysis
        </button>
        <button
          onClick={() => setActiveTab("drills")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "drills"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          🎯 Training Drills
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === "sessions"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          📋 Training Sessions
        </button>
      </div>

      {/* Mistake Analysis Tab */}
      {activeTab === "mistakes" && (
        <div className="space-y-6">
          {/* Video Selection */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">Select Match Video</h2>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={selectedVideo || ""}
              onChange={(e) => {
                setSelectedVideo(e.target.value);
                fetchMistakes(e.target.value);
              }}
            >
              <option value="">-- Select a video --</option>
              {videos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.filename} ({new Date(video.uploadTimestamp).toLocaleDateString()})
                </option>
              ))}
            </select>

            {selectedVideo && !mistakeAnalysis && (
              <div className="mt-4">
                <button
                  onClick={() => {
                    const teamName = prompt("Enter your team name:");
                    const opponentName = prompt("Enter opponent name:");
                    if (teamName && opponentName) {
                      analyzeMistakes(selectedVideo, teamName, opponentName);
                    }
                  }}
                  disabled={analyzing}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {analyzing ? "Analyzing..." : "🔍 Analyze for Coaching Opportunities"}
                </button>
              </div>
            )}
          </div>

          {/* Mistake Results */}
          {mistakeAnalysis && (
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Detected Mistakes</h2>
                <div className="text-sm text-gray-600">
                  Found {mistakeAnalysis.total_mistakes} coaching opportunities
                </div>
              </div>

              {/* Category Summary */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                {Object.entries(mistakeAnalysis.categories).map(([category, count]) => (
                  <div key={category} className={`p-4 rounded-lg border ${getCategoryColor(category)}`}>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs capitalize">{category.replace(/_/g, " ")}</div>
                  </div>
                ))}
              </div>

              {/* Mistake List */}
              <div className="space-y-3">
                {mistakeAnalysis.mistakes.map((mistake, idx) => (
                  <div
                    key={idx}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedMistakes.has(idx) ? "bg-blue-50 border-blue-500" : "bg-white hover:bg-gray-50"
                    }`}
                    onClick={() => toggleMistakeSelection(idx)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm font-bold text-blue-600">{mistake.timestamp}</span>
                          <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(mistake.category)}`}>
                            {mistake.category.replace(/_/g, " ")}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs ${getImpactColor(mistake.impact)}`}>
                            {mistake.impact} Impact
                          </span>
                        </div>
                        <p className="text-gray-700 mb-2">{mistake.description}</p>
                        {mistake.players_involved.length > 0 && (
                          <div className="text-sm text-gray-600">
                            Players: {mistake.players_involved.join(", ")}
                          </div>
                        )}
                      </div>
                      <div>
                        <input
                          type="checkbox"
                          checked={selectedMistakes.has(idx)}
                          onChange={() => {}}
                          className="w-5 h-5 text-blue-600"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={generateDrills}
                  disabled={selectedMistakes.size === 0 || loading}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  🎯 Generate Training Drills ({selectedMistakes.size} selected)
                </button>
                <button
                  onClick={generateSession}
                  disabled={loading}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
                >
                  📋 Generate Full Training Session
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Training Drills Tab */}
      {activeTab === "drills" && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">AI-Generated Training Drills</h2>
          {generatedDrills ? (
            <div className="space-y-6">
              {/* Render drills here */}
              <p className="text-gray-600">Drills will appear here after generation...</p>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <p>No drills generated yet.</p>
              <p className="text-sm">Select mistakes and click "Generate Training Drills"</p>
            </div>
          )}
        </div>
      )}

      {/* Training Sessions Tab */}
      {activeTab === "sessions" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Training Sessions</h2>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              + New Session
            </button>
          </div>

          {trainingSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trainingSessions.map((session) => (
                <div key={session.id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                  <h3 className="text-lg font-bold mb-2">{session.name || session.session_title}</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>⏱️ Duration: {session.duration} minutes</div>
                    <div>👥 Age Group: {session.age_group}</div>
                    <div>🎯 Focus: {session.focus_areas?.join(", ")}</div>
                    {session.scheduled_date && (
                      <div>📅 Scheduled: {new Date(session.scheduled_date).toLocaleDateString()}</div>
                    )}
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">
                      View Details
                    </button>
                    <button className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                      Export PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-12 rounded-lg shadow text-center text-gray-500">
              <p>No training sessions yet.</p>
              <p className="text-sm">Generate a session from mistake analysis or create one manually.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
