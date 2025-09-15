import React, { useMemo } from 'react';
import { AlertTriangle, Smartphone, Users, Eye, Clock, Download, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import type { Detection, DetectionStats } from '@/types/detection';
import { ScrollArea } from './ui/scroll-area';

interface DetectionLogsProps {
  detections: Detection[];
  sessionStartTime: Date;
  focusMetrics: any;
  videoTitle?: string;
  // Add real-time person count from the hook
  currentPersonCount?: number;
  currentMobileCount?: number;
}

const DetectionLogs: React.FC<DetectionLogsProps> = ({
  detections,
  sessionStartTime,
  focusMetrics,
  videoTitle = "Student Monitoring Session",
  currentPersonCount = 0,
  currentMobileCount = 0,
}) => {
  const stats = useMemo((): DetectionStats => {
    const sessionDuration = (new Date().getTime() - sessionStartTime.getTime()) / 1000;
    
    // Count actual mobile detections (not just any unknown object)
    const mobileDetections = detections.filter(d => d.type === 'mobile' ||  d.type === 'unknown_object').length;
    
    // Count person detections correctly
    const personDetections = detections.filter(d => d.type === 'person').length;
    
    // Focus violations could be calculated differently
    const focusViolations = detections.filter(d => 
      (d.type === 'mobile' && d.confidence > 0.7) || // High confidence mobile usage
      (d.type === 'unknown_object' && d.confidence > 0.8) // High confidence distracting objects
    ).length;

    // Calculate average focus score from recent metrics
    const avgFocusScore = focusMetrics?.focusScore || 100;

    return {
      totalDetections: detections.length,
      mobileDetections,
      personDetections,
      focusViolations,
      sessionDuration: Math.round(sessionDuration),
      averageFocusScore: avgFocusScore,
    };
  }, [detections, sessionStartTime, focusMetrics]);

  const getIcon = (type: Detection['type']) => {
    switch (type) {
      case 'mobile':
        return <Smartphone className="w-4 h-4 text-red-500" />;
      case 'person':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'focus_lost':
        return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'multiple_people':
        return <Users className="w-4 h-4 text-orange-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeLabel = (type: Detection['type']) => {
    switch (type) {
      case 'mobile':
        return 'Mobile Device';
      case 'person':
        return 'Person Detected';
      case 'focus_lost':
        return 'Focus Lost';
      case 'multiple_people':
        return 'Multiple People';
      default:
        return 'Unknown Object';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Confidence', 'Description', 'Current People Count', 'Current Mobile Count'],
      ...detections.map(d => [
        d.timestamp.toISOString(),
        getTypeLabel(d.type),
        `${(d.confidence * 100).toFixed(1)}%`,
        d.description,
        currentPersonCount.toString(),
        currentMobileCount.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monitoring-logs-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generatePDFReport = async () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Student Monitoring Report', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Session Info
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Video Title: ${videoTitle}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Session Start: ${sessionStartTime.toLocaleString()}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Session Duration: ${formatDuration(stats.sessionDuration)}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Report Generated: ${new Date().toLocaleString()}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Current People in Frame: ${currentPersonCount}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Current Mobile Devices: ${currentMobileCount}`, 20, yPosition);
    yPosition += 15;

    // Summary Statistics
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Session Summary', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    const summaryData = [
      `Total Detections: ${stats.totalDetections}`,
      `Mobile Device Alerts: ${stats.mobileDetections}`,
      `Person Detection Events: ${stats.personDetections}`,
      `Focus Violations: ${stats.focusViolations}`,
      `Current Focus Score: ${focusMetrics.focusScore}%`,
      `Eye Contact Score: ${focusMetrics.eyeContactScore}%`,
      `Head Pose Score: ${focusMetrics.headPoseScore}%`,
      `Overall Attention: ${focusMetrics.overallAttention}%`
    ];

    summaryData.forEach(item => {
      pdf.text(item, 20, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Real-time Analysis
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Current Status Analysis', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const currentAnalysis = [];
    
    // Person count analysis
    if (currentPersonCount === 0) {
      currentAnalysis.push('• No person detected in frame - student may be absent');
    } else if (currentPersonCount === 1) {
      currentAnalysis.push('• Single person detected - optimal learning environment');
    } else {
      currentAnalysis.push(`• ${currentPersonCount} people detected - potential distractions present`);
    }

    // Mobile analysis
    if (currentMobileCount === 0) {
      currentAnalysis.push('• No mobile devices detected - good focus environment');
    } else {
      currentAnalysis.push(`• ${currentMobileCount} mobile device(s) detected - attention may be divided`);
    }

    // Focus analysis
    if (focusMetrics.focusScore >= 80) {
      currentAnalysis.push('• Excellent focus level maintained');
    } else if (focusMetrics.focusScore >= 60) {
      currentAnalysis.push('• Good focus with minor distractions');
    } else if (focusMetrics.focusScore >= 40) {
      currentAnalysis.push('• Moderate focus - intervention recommended');
    } else {
      currentAnalysis.push('• Poor focus - immediate attention required');
    }

    currentAnalysis.forEach(analysis => {
      const lines = pdf.splitTextToSize(analysis, pageWidth - 40);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });
    });
    yPosition += 10;

    // Recommendations based on current state
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Recommendations', 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    
    const recommendations = [];
    if (currentPersonCount === 0) {
      recommendations.push('• Check if student is present and camera is working');
    }
    if (currentMobileCount > 0) {
      recommendations.push('• Remind student to put away mobile devices');
    }
    if (focusMetrics.focusScore < 70) {
      recommendations.push('• Consider a short break or change in activity');
    }
    if (focusMetrics.eyeContactScore < 70) {
      recommendations.push('• Encourage student to look at camera/screen');
    }
    if (stats.mobileDetections > 5) {
      recommendations.push('• Discuss device usage policies with student');
    }
    if (recommendations.length === 0) {
      recommendations.push('• Student is maintaining excellent focus');
      recommendations.push('• Continue with current learning approach');
    }

    recommendations.forEach(rec => {
      const lines = pdf.splitTextToSize(rec, pageWidth - 40);
      lines.forEach((line: string) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.text(line, 20, yPosition);
        yPosition += 6;
      });
    });

    // Continue with detailed log as before...
    if (detections.length > 0) {
      yPosition += 10;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Detailed Detection Log (Last 20 Events)', 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      
      const headers = ['Time', 'Type', 'Confidence', 'Description'];
      const colWidths = [30, 40, 25, 85];
      let xPos = 20;
      
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, i) => {
        pdf.text(header, xPos, yPosition);
        xPos += colWidths[i];
      });
      yPosition += 8;

      pdf.setFont('helvetica', 'normal');
      detections.slice(-20).forEach(detection => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        
        xPos = 20;
        const rowData = [
          detection.timestamp.toLocaleTimeString(),
          getTypeLabel(detection.type),
          `${(detection.confidence * 100).toFixed(1)}%`,
          detection.description
        ];
        
        rowData.forEach((data, i) => {
          const lines = pdf.splitTextToSize(data, colWidths[i] - 2);
          pdf.text(lines[0] || '', xPos, yPosition);
          xPos += colWidths[i];
        });
        yPosition += 6;
      });
    }

    const fileName = `student-monitoring-report-${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current status text for people count
  const getCurrentPeopleStatus = () => {
    if (currentPersonCount === 0) {
      return { text: "No one detected", color: "text-yellow-800", bgColor: "from-yellow-50 to-yellow-100" };
    } else if (currentPersonCount === 1) {
      return { text: "1 person present", color: "text-green-800", bgColor: "from-green-50 to-green-100" };
    } else {
      return { text: `${currentPersonCount} people`, color: "text-orange-800", bgColor: "from-orange-50 to-orange-100" };
    }
  };

  const peopleStatus = getCurrentPeopleStatus();

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 max-h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col items-start justify-between mb-4 gap-2">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-blue-600" />
          Detection Monitor
        </h2>
        <div className="flex justify-start gap-3 w-full space-x-2">
          <button
            onClick={exportLogs}
            className="flex items-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">CSV</span>
          </button>
          <button
            onClick={generatePDFReport}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:blue-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span className="text-sm">PDF Report</span>
          </button>
        </div>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Session Time</p>
              <p className="text-2xl font-bold text-blue-800">
                {formatDuration(stats.sessionDuration)}
              </p>
            </div>
            <Clock className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Focus Score</p>
              <p className="text-2xl font-bold text-green-800">
                {focusMetrics?.focusScore || 100}%
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Mobile Alerts</p>
              <p className="text-2xl font-bold text-red-800">
                {stats.mobileDetections}
              </p>
              <p className="text-xs text-red-600">
                Current: {currentMobileCount}
              </p>
            </div>
            <Smartphone className="w-8 h-8 text-red-600" />
          </div>
        </div>

        <div className={`bg-gradient-to-r ${peopleStatus.bgColor} rounded-lg p-4`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">People Count</p>
              <p className={`text-2xl font-bold ${peopleStatus.color}`}>
                {currentPersonCount}
              </p>
              <p className={`text-xs ${peopleStatus.color}`}>
                {peopleStatus.text}
              </p>
            </div>
            <Users className="w-8 h-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Current Status Indicator */}
      <div className="mb-2 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Live Status:</span>
          <div className="flex space-x-4">
            <span className={`font-medium ${peopleStatus.color}`}>
              👥 {peopleStatus.text}
            </span>
            <span className={`font-medium ${currentMobileCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
              📱 {currentMobileCount === 0 ? 'No devices' : `${currentMobileCount} device(s)`}
            </span>
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="flex-1 overflow-hidden">
        <h3 className="font-semibold text-gray-800 mb-3">Recent Detections</h3>
        <ScrollArea className='h-50'>

       
        <div className="h-full overflow-y-auto space-y-2">
          {detections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>No detections yet</p>
              <p className="text-sm">Monitoring active...</p>
            </div>
          ) : (
            detections
              .slice()
              .reverse()
              .map((detection) => (
                <div
                  key={detection.id}
                  className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-shrink-0 mt-1">
                    {getIcon(detection.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-800">
                        {getTypeLabel(detection.type)}
                      </p>
                      <span className="text-xs text-gray-500">
                        {detection.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {detection.description}
                    </p>
                    {detection.bbox && (
                      <p className="text-xs text-gray-500 mt-1">
                        Position: ({Math.round(detection.bbox.x)}, {Math.round(detection.bbox.y)})
                      </p>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
         </ScrollArea>
      </div>
    </div>
  );
};

export default DetectionLogs;