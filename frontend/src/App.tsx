import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Upload, Database, BarChart2, AlertTriangle, CheckCircle, 
         Eye, Shield, Wrench, X, Check, RefreshCw, Sliders, Zap } from 'lucide-react';
import './App.css';

// Types
interface Analysis {
  id: string;
  timestamp: string;
  detected_objects: string[];
  confidence_scores: number[];
  task_phase: string;
  expert_analysis: string;
  safety_assessment: string;
  next_steps: string;
  image_url: string;
}

const App: React.FC = () => {
  // State
  const [currentView, setCurrentView] = useState<'camera' | 'upload' | 'history'>('camera');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<Analysis | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<Analysis[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [captureCountdown, setCaptureCountdown] = useState<number | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showDetectionSettings, setShowDetectionSettings] = useState(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // API settings
  const API_BASE = 'http://localhost:8000';

  // Fetch system status
  const fetchSystemStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/`);
      if (!response.ok) {
        console.error('System status fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch system status', error);
    }
  };

  // Image analysis function
  const analyzeImage = async (imageBase64: string) => {
    console.log('Starting image analysis...');
    
    setIsAnalyzing(true);
    addNotification('Analysis starting...');
    
    try {
      const response = await fetch(`${API_BASE}/analyze/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_base64: imageBase64,
          analysis_type: 'comprehensive'
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.status}`);
      }

      const analysis = await response.json();
      console.log('Analysis complete:', analysis);
      
      setCurrentAnalysis(analysis);
      setAnalysisHistory(prev => [analysis, ...prev]);
      addNotification('Analysis complete');
      
    } catch (error) {
      console.error('Analysis error:', error);
      addNotification('Analysis failed: Server error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Notification system
  const addNotification = (message: string) => {
    setNotifications(prev => [message, ...prev.slice(0, 4)]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== message));
    }, 5000);
  };

  // Camera initialization
  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      setIsCameraReady(false);
      setCameraError(null);
      
      // Stop any existing camera stream
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      
      // Request camera with constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: "environment" 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // Set up event listeners
        videoRef.current.onloadedmetadata = () => {
          if (!videoRef.current) return;
          
          videoRef.current.play()
            .then(() => {
              console.log('Camera started successfully');
              setTimeout(() => {
                setIsCameraReady(true);
                addNotification('Camera ready');
              }, 1000);
            })
            .catch(err => {
              console.error('Camera play error:', err);
              setCameraError('Failed to start video stream');
            });
        };
      }
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError('Camera access denied or not available');
      addNotification('Camera access failed - Try uploading instead');
    }
  };

  // Image capture function
  const captureImage = useCallback(() => {
    console.log('Capturing image...');
    
    if (!videoRef.current || !canvasRef.current || !isCameraReady) {
      addNotification('Camera not ready');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      addNotification('Canvas context not available');
      return;
    }

    // Set canvas dimensions to match video
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    
    console.log('Capture dimensions:', width, 'x', height);
    
    canvas.width = width;
    canvas.height = height;
    
    try {
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to base64
      const imageBase64 = canvas.toDataURL('image/jpeg', 0.85);
      
      if (imageBase64.length > 1000) {
        addNotification('Image captured successfully');
        analyzeImage(imageBase64);
      } else {
        addNotification('Image capture failed - Try again');
      }
    } catch (error) {
      console.error('Capture error:', error);
      addNotification('Capture error - Try uploading instead');
    }
  }, [isCameraReady]);

  // Countdown capture
  const startCountdownCapture = () => {
    if (!isCameraReady) {
      addNotification('Camera not ready');
      return;
    }
    
    setCaptureCountdown(3);
    addNotification('Photo in 3 seconds...');
    
    const countdown = setInterval(() => {
      setCaptureCountdown(prev => {
        if (prev === 1) {
          clearInterval(countdown);
          captureImage();
          return null;
        }
        return prev ? prev - 1 : null;
      });
    }, 1000);
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    addNotification(`Processing: ${file.name}`);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageBase64 = e.target?.result as string;
      if (imageBase64) {
        analyzeImage(imageBase64);
      } else {
        addNotification('Failed to read file');
      }
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  // Handle key press for capture
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && currentView === 'camera' && isCameraReady && !isAnalyzing) {
      startCountdownCapture();
    }
  }, [currentView, isCameraReady, isAnalyzing]);

  // Initialize
  useEffect(() => {
    fetchSystemStatus();
    
    if (currentView === 'camera') {
      startCamera();
    }
    
    // Add keyboard listener
    window.addEventListener('keydown', handleKeyPress);
    
    // Cleanup function
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      
      // Stop camera when component unmounts
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentView, handleKeyPress]);

  // Component: Top Navigation Bar
  const NavigationBar = () => (
    <div className="bg-slate-800 border-b border-slate-700">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center border-2 border-blue-400">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-white">Industrial<span className="text-blue-400">AI</span></h1>
              <div className="text-xs text-blue-300">OBJECT DETECTION SYSTEM</div>
            </div>
          </div>
          
          {/* Main Navigation */}
          <div className="flex items-center space-x-1">
            <button 
              onClick={() => setCurrentView('camera')}
              className={`nav-button ${currentView === 'camera' ? 'nav-button-active' : ''}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              <span>Camera</span>
            </button>
            <button 
              onClick={() => setCurrentView('upload')}
              className={`nav-button ${currentView === 'upload' ? 'nav-button-active' : ''}`}
            >
              <Upload className="w-4 h-4 mr-2" />
              <span>Upload</span>
            </button>
            <button 
              onClick={() => setCurrentView('history')}
              className={`nav-button ${currentView === 'history' ? 'nav-button-active' : ''}`}
            >
              <Database className="w-4 h-4 mr-2" />
              <span>History</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Component: Notifications
  const Notifications = () => (
    <div className="fixed top-20 right-4 z-30 space-y-2">
      {notifications.map((notification, index) => (
        <div
          key={index}
          className="bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-lg shadow-lg animate-slide-in flex items-center"
        >
          <Check className="w-4 h-4 text-blue-400 mr-2" />
          <p className="text-sm">{notification}</p>
        </div>
      ))}
    </div>
  );

  // Component: Camera View
  const CameraView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Camera Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2>CAMERA FEED</h2>
          
          <div className="flex items-center space-x-2">
            {captureCountdown && (
              <div className="bg-red-500 text-white w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold">
                {captureCountdown}
              </div>
            )}
            
            <button
              onClick={() => setShowDetectionSettings(!showDetectionSettings)}
              className="button button-icon"
              title="Camera Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
            
            <button
              onClick={startCountdownCapture}
              disabled={isAnalyzing || !isCameraReady}
              className={`button ${isCameraReady && !isAnalyzing ? 'button-primary' : 'button-disabled'}`}
            >
              <Camera className="w-4 h-4 mr-2" />
              <span>Capture</span>
            </button>
          </div>
        </div>
        
        <div className="panel-content">
          {/* Camera View with Feedback Status */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Camera Overlay States */}
            {!isCameraReady && !cameraError && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-sm">Initializing camera...</p>
                </div>
              </div>
            )}
            
            {cameraError && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                <div className="text-center max-w-md p-6">
                  <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-4" />
                  <p className="text-white text-sm mb-2">CAMERA ERROR</p>
                  <p className="text-gray-300 mb-4 text-sm">{cameraError}</p>
                  <div className="flex justify-center space-x-3">
                    <button
                      onClick={startCamera}
                      className="button button-secondary text-sm"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      <span>Retry</span>
                    </button>
                    <button
                      onClick={() => setCurrentView('upload')}
                      className="button button-primary text-sm"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      <span>Upload Instead</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {isAnalyzing && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white text-sm">Analyzing image...</p>
                </div>
              </div>
            )}
            
            {/* Press Enter Indicator (when camera ready) */}
            {isCameraReady && !isAnalyzing && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-sm py-1 px-3 rounded-full">
                Press <kbd className="bg-gray-700 px-2 py-0.5 rounded">Enter</kbd> to capture
              </div>
            )}
          </div>
          
          {/* Settings Panel (conditionally shown) */}
          {showDetectionSettings && (
            <div className="mt-4 bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-white text-sm font-semibold">Detection Settings</h3>
                <button 
                  onClick={() => setShowDetectionSettings(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Detection Quality</label>
                  <select className="w-full bg-slate-700 text-white rounded border border-slate-600 py-1 px-2 text-sm">
                    <option>Standard (Faster)</option>
                    <option>High Quality (Slower)</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Confidence Threshold</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    defaultValue="40"
                    className="w-full" 
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>Lower (More Objects)</span>
                    <span>Higher (More Accurate)</span>
                  </div>
                </div>
                
                <div className="pt-2">
                  <button className="button button-primary w-full">
                    <Zap className="w-4 h-4 mr-2" />
                    <span>Apply Settings</span>
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Camera Status */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="status-card">
              <span className="status-label">STATUS</span>
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${isCameraReady ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                <span className="status-value">{isCameraReady ? "READY" : "INITIALIZING"}</span>
              </div>
            </div>
            <div className="status-card">
              <span className="status-label">RESOLUTION</span>
              <span className="status-value">
                {videoRef.current?.videoWidth || 0} x {videoRef.current?.videoHeight || 0}
              </span>
            </div>
            <div className="status-card">
              <span className="status-label">HELP</span>
              <span className="status-value">PRESS ENTER TO CAPTURE</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Analysis Results Panel */}
      <AnalysisPanel />
    </div>
  );

  // Component: Upload View
  const UploadView = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Upload Panel */}
      <div className="panel">
        <div className="panel-header">
          <h2>UPLOAD IMAGE</h2>
        </div>
        
        <div className="panel-content">
          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 bg-slate-900 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors flex flex-col items-center justify-center"
            style={{ minHeight: "300px" }}
          >
            <Upload className="w-12 h-12 text-slate-600 mb-4" />
            <p className="text-slate-400 mb-2">Click to select image</p>
            <p className="text-slate-500 text-xs">JPG, PNG files accepted</p>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>
          
          {/* Analysis Progress */}
          {isAnalyzing && (
            <div className="mt-6 text-center">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-slate-400 text-sm uppercase tracking-wider">Processing image...</p>
            </div>
          )}
          
          {/* Upload Instructions */}
          <div className="mt-4 bg-slate-800 rounded-lg p-4 text-sm text-slate-300">
            <div className="text-slate-400 uppercase tracking-wider mb-2 text-xs">UPLOAD TIPS:</div>
            <ul className="list-disc pl-4 space-y-1 text-xs">
              <li>For best results, ensure good lighting</li>
              <li>Center the objects in the frame</li>
              <li>Use images with clear visibility of tools/equipment</li>
              <li>Recommended resolution: 800x600 or higher</li>
            </ul>
          </div>
        </div>
      </div>
      
      {/* Analysis Results Panel */}
      <AnalysisPanel />
    </div>
  );

  // Component: History View
  const HistoryView = () => (
    <div className="panel">
      <div className="panel-header">
        <h2>ANALYSIS HISTORY</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400">
            {analysisHistory.length} RECORDS
          </span>
        </div>
      </div>
      
      <div className="panel-content">
        {analysisHistory.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <Database className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No history data available</p>
              <p className="text-slate-400 text-xs mt-2">Analysis records will appear here</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analysisHistory.map((analysis) => (
              <div key={analysis.id} className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
                <div className="h-40 bg-slate-900 relative">
                  <img 
                    src={`${API_BASE}${analysis.image_url}`}
                    alt="Analysis result" 
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                    {analysis.detected_objects.length} objects
                  </div>
                </div>
                
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-slate-400">
                        {new Date(analysis.timestamp).toLocaleString()}
                      </div>
                      <div className="badge-primary mt-1">
                        {analysis.task_phase?.replace(/_/g, ' ') || 'Unknown'}
                      </div>
                    </div>
                    <button className="button-icon" onClick={() => setCurrentAnalysis(analysis)}>
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-1 mb-2">
                    {analysis.detected_objects.slice(0, 3).map((obj, i) => (
                      <span key={i} className="badge-small">
                        {obj}
                      </span>
                    ))}
                    {analysis.detected_objects.length > 3 && (
                      <span className="badge-small">
                        +{analysis.detected_objects.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // Component: Analysis Panel (shared between Camera and Upload views)
  const AnalysisPanel = () => (
    <div className="panel">
      <div className="panel-header">
        <h2>ANALYSIS RESULTS</h2>
        {currentAnalysis && (
          <div className="flex items-center space-x-2">
            <div className="bg-slate-700 px-2 py-1 rounded text-xs">
              ID: {currentAnalysis.id.slice(0, 8)}
            </div>
            <button className="button button-secondary text-xs" onClick={() => setCurrentAnalysis(null)}>
              CLEAR
            </button>
          </div>
        )}
      </div>
      
      <div className="panel-content">
        {currentAnalysis ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Detection Image */}
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Detected Objects</div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden" style={{height: '280px'}}>
                  <img 
                    src={`${API_BASE}${currentAnalysis.image_url}`}
                    alt="Detection Results" 
                    className="mx-auto h-full object-contain"
                  />
                </div>
              </div>
              
              {/* Detection Summary */}
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Detection Summary</div>
                <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 h-full flex flex-col">
                  {/* Task Phase */}
                  <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1">OPERATION PHASE:</div>
                    <div className="badge-primary">
                      {currentAnalysis?.task_phase ? currentAnalysis.task_phase.replace(/_/g, ' ') : 'Unknown Phase'}
                    </div>
                  </div>
                  
                  {/* Detected Objects */}
                  <div className="mb-3">
                    <div className="text-xs text-slate-400 mb-1">DETECTED ENTITIES:</div>
                    <div className="flex flex-wrap gap-2">
                      {currentAnalysis.detected_objects && currentAnalysis.detected_objects.length > 0 ? (
                        currentAnalysis.detected_objects.map((obj, index) => (
                          <span
                            key={index}
                            className="badge-secondary"
                          >
                            {obj} ({Math.round(currentAnalysis.confidence_scores[index] * 100)}%)
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-500">No objects detected</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Safety Assessment */}
                  <div className="mt-auto">
                    <div className="text-xs text-slate-400 mb-1">SAFETY STATUS:</div>
                    <div className="flex items-start space-x-2">
                      <Shield className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-slate-300">{currentAnalysis.safety_assessment}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Expert Analysis */}
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Expert Analysis</div>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 max-h-60 overflow-y-auto">
                <pre className="text-sm text-slate-300 whitespace-pre-line">{currentAnalysis.expert_analysis}</pre>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64 text-center">
            <div>
              <Eye className="w-12 h-12 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-500 text-sm">No analysis data available</p>
              <p className="text-slate-400 text-xs mt-2">
                {currentView === 'camera' 
                  ? 'Capture an image to perform analysis' 
                  : 'Upload an image to perform analysis'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <NavigationBar />
      <Notifications />
      
      <main className="flex-1 container mx-auto px-4 py-6">
        {currentView === 'camera' && <CameraView />}
        {currentView === 'upload' && <UploadView />}
        {currentView === 'history' && <HistoryView />}
      </main>
      
      <footer className="bg-slate-800 border-t border-slate-700 py-3">
        <div className="container mx-auto px-4 text-center text-slate-500 text-xs">
          <div className="flex items-center justify-center space-x-2">
            <Wrench className="w-4 h-4" />
            <span>INDUSTRIAL AI ASSISTANT v1.0</span>
            <span className="px-2">•</span>
            <span>{new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;




