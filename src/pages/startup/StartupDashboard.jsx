import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "../../components/ui/card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent
} from "../../components/ui/tabs";
import {
  Alert,
  AlertDescription
} from "../../components/ui/alert";
import {
  BarChart,
  Building2,
  Clock,
  FileText,
  Mail,
  Upload,
  Users,
  CheckCircle,
  AlertCircle,
  Search,
  Calendar,
  PieChart,
  Download,
  Building
} from 'lucide-react';
import useGetFile from '../../components/useGetFile';
import useUploadFile from '../../components/useUploadFile';
import { NavLink, useNavigate } from "react-router-dom";

const ActionButton = ({ icon, label, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
    aria-label={label}
  >
    {icon}
    <span className="mt-2 text-sm text-gray-700">{label}</span>
  </button>
);

const StartupDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [startupData, setStartupData] = useState(null);
  const [uniqueIdentifier] = useState(
    sessionStorage.getItem("uniqueIdentifier") || "defaultUser"
  ); 

  const { getFile } = useGetFile();
  const memoizedGetFile = useCallback(getFile, []);

  const handleVCOutreach = () => {
    navigate("/startup-vcoutreach");
  };

  const handleNewApplication = () => {
    navigate("/startup-auto-form");
  }
  

  useEffect(() => {
    let isMounted = true;
  
    const fetchStartupData = async () => {
      const filePath = `/var/data/users/${uniqueIdentifier}/startup/startup_data.json`;
      const data = await memoizedGetFile(filePath);
      if (isMounted && data) {
        setStartupData(data);
        sessionStorage.setItem("startupData", JSON.stringify(data)); // Store in sessionStorage
      }
    };
  
    fetchStartupData();
  
    return () => {
      isMounted = false;
    };
  }, [uniqueIdentifier, memoizedGetFile]); 
  

  console.log(startupData);

  // Hardcoded data for demonstration; replace with startupData as needed
  const data = {
    companyProfile: {
      name: "TechStart AI",
      founded: "2023",
      industry: "Artificial Intelligence",
      stage: "Seed",
      location: "San Francisco, CA",
      teamSize: 5,
      fundraising: "$500k"
    },
    applications: [
      {
        id: 1,
        program: "Y Combinator W24",
        status: "In Progress",
        deadline: "2024-02-15",
        progress: 75,
        questions: 42,
        questionsCompleted: 32,
        lastUpdated: "2h ago"
      },
      {
        id: 2,
        program: "Techstars NYC",
        status: "Draft",
        deadline: "2024-03-01",
        progress: 30,
        questions: 35,
        questionsCompleted: 12,
        lastUpdated: "1d ago"
      },
      {
        id: 3,
        program: "500 Startups",
        status: "Review Needed",
        deadline: "2024-02-28",
        progress: 90,
        questions: 38,
        questionsCompleted: 35,
        lastUpdated: "5h ago"
      }
    ],
    vcOutreach: [
      {
        id: 1,
        name: "Sequoia Capital",
        status: "Email Draft Ready",
        research: "Complete",
        lastContact: null,
        matchScore: 85
      },
      {
        id: 2,
        name: "Andreessen Horowitz",
        status: "Sent",
        research: "Complete",
        lastContact: "2024-01-25",
        matchScore: 92
      },
      {
        id: 3,
        name: "Accel",
        status: "Research In Progress",
        research: "70%",
        lastContact: null,
        matchScore: 78
      }
    ],
    alerts: [
      {
        id: 1,
        type: "review",
        message: "Y Combinator application needs review - 3 questions flagged",
        urgent: true
      },
      {
        id: 2,
        type: "deadline",
        message: "Techstars NYC application deadline in 5 days",
        urgent: true
      },
      {
        id: 3,
        type: "ai",
        message: "AI completed research for Sequoia Capital",
        urgent: false
      }
    ]
  };

  // Handler functions for ActionButtons

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Company Profile Banner */}
      <Card className="mb-6">
        <CardContent className="flex flex-col md:flex-row items-start md:items-center justify-between p-6">
          <div>
            <h1 className="text-3xl font-bold text-indigo-600">{startupData?.companyName || data.companyProfile.name}</h1>
            <p className="text-gray-500 mt-1">
              {startupData?.industry || data.companyProfile.industry} • {startupData?.stage || data.companyProfile.stage} • {startupData?.location || data.companyProfile.location}
            </p>
          </div>
          <div className="flex space-x-8 mt-4 md:mt-0">
            <div className="text-sm">
              <p className="text-gray-500">Team Size</p>
              <p className="font-semibold text-gray-700">{startupData?.teamSize || data.companyProfile.teamSize}</p>
            </div>
            <div className="text-sm">
              <p className="text-gray-500">Raising</p>
              <p className="font-semibold text-gray-700">{startupData?.fundraising || data.companyProfile.fundraising}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Section */}
      <div className="mb-6 space-y-4">
        {data.alerts.map(alert => (
          <Alert key={alert.id} variant={alert.urgent ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4 mr-2" />
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        ))}
      </div>

      {/* Main Dashboard with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="flex flex-wrap gap-2 bg-white rounded-lg shadow">
          <TabsTrigger value="home" className="flex-1 text-center py-2">
            Home
          </TabsTrigger>
          <TabsTrigger value="applications" className="flex-1 text-center py-2">
            Applications
          </TabsTrigger>
          <TabsTrigger value="vc-outreach" className="flex-1 text-center py-2">
            VC Outreach
          </TabsTrigger>
          <TabsTrigger value="programs" className="flex-1 text-center py-2">
            Program Search
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 text-center py-2">
            Documents
          </TabsTrigger>
        </TabsList>

        {/* Home Tab Content */}
        <TabsContent value="home">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Application Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Application Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.applications.map(app => (
                    <div key={app.id} className="flex flex-col space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{app.program}</p>
                          <p className="text-sm text-gray-500">Due: {app.deadline}</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${app.progress}%` }}
                            />
                          </div>
                          <span className="text-sm">{app.progress}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* VC Outreach Status Card */}
            <Card>
              <CardHeader>
                <CardTitle>VC Outreach Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.vcOutreach.map(vc => (
                    <div key={vc.id} className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{vc.name}</p>
                        <p className="text-sm text-gray-500">{vc.status}</p>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        Match: {vc.matchScore}%
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <ActionButton
                    icon={<FileText className="h-6 w-6 text-indigo-600" />}
                    label="New Application"
                    onClick={handleNewApplication}
                  />
                  <ActionButton
                    icon={<Mail className="h-6 w-6 text-green-600" />}
                    label="VC Outreach"
                    onClick={handleVCOutreach}
                  />
                  <ActionButton
                    icon={<Upload className="h-6 w-6 text-yellow-600" />}
                    label="Upload Documents"
                  />
                  <ActionButton
                    icon={<Download className="h-6 w-6 text-red-600" />}
                    label="Generate Report"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Applications Tab Content */}
        <TabsContent value="applications">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Applications */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Active Applications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {data.applications.map(app => (
                      <div key={app.id} className="border rounded-lg p-4 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <h3 className="font-bold">{app.program}</h3>
                            <p className="text-sm text-gray-500">Last updated: {app.lastUpdated}</p>
                          </div>
                          <span
                            className={`px-3 py-1 rounded-full text-sm ${
                              app.status === "In Progress"
                                ? "bg-blue-100 text-blue-800"
                                : app.status === "Draft"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {app.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Progress</span>
                            <span>{app.progress}%</span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 rounded-full">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${app.progress}%` }}
                            />
                          </div>
                          <div className="flex justify-between text-sm text-gray-500">
                            <span>
                              {app.questionsCompleted}/{app.questions} questions completed
                            </span>
                            <span>Due: {app.deadline}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Response Library and AI Assistant Status */}
            <div>
              {/* Response Library */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Response Library</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                      <p className="font-medium">Company Mission</p>
                      <p className="text-sm text-gray-500">Used 8 times</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                      <p className="font-medium">Market Size</p>
                      <p className="text-sm text-gray-500">Used 5 times</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg shadow-sm">
                      <p className="font-medium">Growth Strategy</p>
                      <p className="text-sm text-gray-500">Used 6 times</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* AI Assistant Status */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Assistant Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-5 w-5 text-green-500" />
                      <span>Knowledge Base Updated</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                      <span>3 Questions Need Review</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* VC Outreach Tab Content */}
        <TabsContent value="vc-outreach">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {data.vcOutreach.map(vc => (
              <Card key={vc.id}>
                <CardHeader>
                  <CardTitle>{vc.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 mb-2">Status: {vc.status}</p>
                  <p className="text-sm text-gray-500 mb-2">Research: {vc.research}</p>
                  <p className="text-sm text-gray-500 mb-4">Match Score: {vc.matchScore}%</p>
                  <button
                    className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                  >
                    View Details
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Program Search Tab Content */}
        <TabsContent value="programs">
          {/* Implement Program Search Content Here */}
          <Card>
            <CardHeader>
              <CardTitle>Program Search</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Program Search content goes here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab Content */}
        <TabsContent value="documents">
          {/* Implement Documents Content Here */}
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">Documents content goes here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StartupDashboard;
