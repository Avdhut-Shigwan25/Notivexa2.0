import { Slide } from "./types";
import { SlidePreviewModal } from "./components/SlidePreviewModal";
import { UniversityPaperEditor } from "./components/UniversityPaperEditor";
import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { BookOpen, GraduationCap, Upload, FileText, Presentation, FileQuestion, Download, Loader2, Shuffle, LogOut, AlertCircle, X, Camera, Clock, Trash2, RefreshCw, ExternalLink, Calendar, FileVideo, Sun, Moon, CheckCircle2, Workflow, ArrowRight, Sparkles, ChevronDown, Maximize2 , Play, Pause, Square, Volume2 , Check, Target, Activity, LampDesk, BookMarked, Library, Sigma, Pi, Binary, Lightbulb, Layers, Video, Search, CheckCircle, Settings, ChevronLeft, ChevronRight, Menu, Bot, MessageCircle, CalendarDays, ScanText, CircleHelp, ListChecks } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import mermaid from "mermaid";
import { auth, db } from "./firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut, User, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp, getDoc, collection, addDoc, deleteDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { VideoExplainer, VideoData } from "./components/VideoExplainer";
import { UserProfile } from "./components/UserProfile";
import { UserAccountPanel } from "./components/UserAccountPanel";
import { AuthForm } from "./components/AuthForm";
import { Chatbot } from "./components/Chatbot";

type Mode = "student";


export const cleanBulletText = (text: string): string => {
  if (!text) return "";
  return text
    .trim()
    .replace(/^[\s\*\-\+•▪▫❖➔➢✔✓☑●○◘◙◦✓\-]+/g, "")
    .trim();
};

export const splitBullet = (bullet: string): { label: string; desc: string } => {
  if (!bullet) return { label: "", desc: "" };
  let label = "";
  let desc = bullet;

  // Look for bold pattern **Label** or **Label:**
  const boldMatch = bullet.match(/^\s*\*\*(.*?)\*\*\s*[:\-]?\s*(.*)/);
  if (boldMatch) {
    label = boldMatch[1].trim();
    desc = boldMatch[2].trim();
  }
 else {
    // Try splitting on first colon, dash, or pipe
    const colonIndex = bullet.indexOf(":");
    const dashIndex = bullet.indexOf(" - ");
    const pipeIndex = bullet.indexOf("|");
    
    // Choose the earliest split index that is valid (reasonable length for a label, e.g. < 40 chars)
    const indices = [
      { idx: colonIndex, char: ":" },
      { idx: dashIndex, char: " - " },
      { idx: pipeIndex, char: "|" }
    ].filter(item => item.idx !== -1 && item.idx < 45);

    if (indices.length > 0) {
      indices.sort((a, b) => a.idx - b.idx);
      const splitItem = indices[0];
      label = bullet.substring(0, splitItem.idx).trim();
      desc = bullet.substring(splitItem.idx + splitItem.char.length).trim();
    }

  }


  // Final cleanup of label and desc
  label = label.replace(/^[\s\*\-\+•▪▫❖➔➢✔✓☑●○◘◙◦✓\-]+/g, "").trim();
  desc = desc.trim();

  return { label, desc: desc || bullet };
};

interface HistoryItem {
  id: string;
  title: string;
  type: "notes" | "assessment" | "flashcards" | "lesson-plan" | "video" | string;
  questionBankType?: string;
  questionBankBloomLevel?: string;
  fileUri: string;
  mimeType: string;
  resultText: string;
  slides?: Slide[];
  flashcards: { term: string; definition: string }[];
  videoData?: VideoData | null;
  lessonPlan?: {
    duration: string;
    totalSessions: string;
    sessions: {
      name: string;
      duration: string;
      description: string;
      objectives: string[];
      activities: string[];
    }[];
    fullMarkdownPlan: string;
  }
 | null;
  focusArea: string;
  createdAt: any;
}

function preprocessMermaid(chartCode: string): string {
  if (!chartCode) return "";
  let code = chartCode.replace(/\\n/g, "\n").trim();
  code = code.replace(/^```mermaid\s*/i, "").replace(/```\s*$/, "").trim();
  code = code.replace(/(-->|---|==>|-\-\>|->>|-->>|->)\s*"([A-Za-z0-9_\-]+)"(?!\s*[\[\(\{])/g, '$1 $2');
  return code;
}

function MermaidChart({ chart, handwritingFont, mode, penColor, isDarkMode }: { chart: string; handwritingFont?: string; mode?: string; penColor?: string; isDarkMode?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  const preprocessedChart = preprocessMermaid(chart);

  useEffect(() => {
    setHasError(false);
    
    const font = (mode === 'student') ? (
      handwritingFont === 'font-handwriting' ? 'Caveat, cursive' :
      handwritingFont === 'font-handwriting-indie' ? '"Indie Flower", cursive' :
      handwritingFont === 'font-handwriting-kalam' ? 'Kalam, cursive' :
      handwritingFont === 'font-handwriting-shadows' ? '"Shadows Into Light", cursive' :
      handwritingFont === 'font-handwriting-patrick' ? '"Patrick Hand", cursive' :
      'Caveat, cursive') : 'Inter, sans-serif';

    const isDark = isDarkMode || (typeof document !== "undefined" && document.documentElement.classList.contains("dark"));
    const mainColor = isDark 
      ? (penColor === 'blue' ? '#93c5fd' : '#f3f4f6')
      : (penColor === 'blue' ? '#1d4ed8' : '#111827');
    const strokeColor = isDark
      ? (penColor === 'blue' ? '#60a5fa' : '#9ca3af')
      : (penColor === 'blue' ? '#2563eb' : '#374151');
    const bkgColor = isDark ? '#22221f' : '#ffffff';

    mermaid.initialize({
      htmlLabels: false,
      startOnLoad: false,
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: {
        fontFamily: font,
        primaryColor: bkgColor,
        primaryTextColor: mainColor,
        lineColor: strokeColor,
        nodeBorder: strokeColor,
        mainBkg: bkgColor,
        labelTextColor: mainColor,
        actorLineColor: strokeColor,
        actorBkg: bkgColor,
        actorTextColor: mainColor,
        signalColor: strokeColor,
        signalTextColor: mainColor,
      },
      flowchart: {
        htmlLabels: false,
        curve: 'basis'
      },
      sequence: {
        showSequenceNumbers: false,
        actorFontFamily: font,
        noteFontFamily: font,
        messageFontFamily: font
      }

    });

    if (ref.current && preprocessedChart) {
      const renderId = `mermaid-${Math.random().toString(36).substring(7)}`;

      mermaid.render(renderId, preprocessedChart).then(({ svg }) => {
        if (svg.includes("Syntax error")) throw new Error("Mermaid syntax error SVG");
        if (ref.current) {
          ref.current.innerHTML = svg;
          setHasError(false);
        }

      }).catch(err => {
        console.warn("First Mermaid render failed, trying level-1 fallback...", err);
        // Level 1: Clean labels to strictly safe characters
        const fallbackChart = preprocessedChart
          .replace(/\["([^"\n]*)"\]/g, (_, inner) => `["${inner.replace(/[^A-Za-z0-9_\-\s:\.,\(\)'\/\+]/g, " ")}"]`)
          .replace(/\("([^"\n]*)"\)/g, (_, inner) => `("${inner.replace(/[^A-Za-z0-9_\-\s:\.,\(\)'\/\+]/g, " ")}")`)
          .replace(/<br\s*\/?>/gi, " ");
        
        const fallbackId = `mermaid-${Math.random().toString(36).substring(7)}`;
        mermaid.render(fallbackId, fallbackChart).then(({ svg }) => {
          if (svg.includes("Syntax error")) throw new Error("Mermaid syntax error SVG");
          if (ref.current) {
            ref.current.innerHTML = svg;
            setHasError(false);
          }

        }).catch(fallbackErr => {
          console.warn("Level 1 fallback failed, trying level-2 rebuild...", fallbackErr);
          
          // Level 2 skipped because we removed aggressive sanitizers.
          setHasError(true);
          const level2Id = `mermaid-${Math.random().toString(36).substring(7)}`; // Dummy

          mermaid.render(level2Id, fallbackChart).then(({ svg }) => {
            if (svg.includes("Syntax error")) throw new Error("Mermaid syntax error SVG");
            if (ref.current) {
              ref.current.innerHTML = svg;
              setHasError(false);
            }

          }).catch(lastErr => {
            console.warn("Mermaid render fallback to visual concept sequence:", lastErr);
            setHasError(true);
          });
        });
      });
    }

  }, [preprocessedChart, handwritingFont, mode, penColor, isDarkMode]);

  if (hasError) {

    return (
      <div className={`my-8 border rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px] relative overflow-hidden ${
        isDarkMode ? "bg-[#22221F] border-[#383832]" : "bg-white border-slate-200 shadow-xs"
      }
`}>
        <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 border border-amber-200">Simplified Schematic</span>
        <div className="p-4 bg-slate-50 rounded-xl text-left text-xs font-mono text-slate-700 w-full overflow-x-auto border border-slate-200/80">
          <pre>{chart}</pre>
        </div>
      </div>);
  }


  return (
    <div className="flex flex-col gap-4">
      <div ref={ref} className={`my-8 flex justify-center bg-white p-4 rounded-xl shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] border border-[#E0E0D5] overflow-x-auto ${mode === 'student' ? 'border-dashed border-2 border-opacity-50' : ''} ${handwritingFont}`} />
    </div>);
}

function oklchToRgb(oklchStr: string): string {
  const match = oklchStr.match(/oklch\(\s*([\d\.]+%?)\s+([\d\.]+)\s+([\d\.]+)(?:\s*\/\s*([\d\.]+%?))?\s*\)/i);
  if (!match) return oklchStr;

  let l = parseFloat(match[1]);
  if (match[1].endsWith('%')) l /= 100;

  const c = parseFloat(match[2]);
  const h = parseFloat(match[3]);

  let alpha = 1;
  if (match[4]) {
    alpha = parseFloat(match[4]);
    if (match[4].endsWith('%')) alpha /= 100;
  }


  const hRad = (h * Math.PI) / 180;
  const labA = c * Math.cos(hRad);
  const labB = c * Math.sin(hRad);

  const l_ = l + 0.3963377774 * labA + 0.2158037573 * labB;
  const m_ = l - 0.1055613458 * labA - 0.0638541728 * labB;
  const s_ = l - 0.0894841775 * labA - 1.2914855480 * labB;

  const l3 = l_ * l_ * l_;
  const m3 = m_ * m_ * m_;
  const s3 = s_ * s_ * s_;

  let rLinear = 4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
  let gLinear = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
  let bLinear = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

  const toSrgb = (val: number) => {
    if (val <= 0.0031308) return Math.max(0, Math.min(255, Math.round(12.92 * val * 255)));
    return Math.max(0, Math.min(255, Math.round((1.055 * Math.pow(val, 1 / 2.4) - 0.055) * 255)));
  };

  const r = toSrgb(rLinear);
  const g = toSrgb(gLinear);
  const b = toSrgb(bLinear);

  return alpha === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("student");
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<{fileUri: string, mimeType: string} | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingType, setGeneratingType] = useState<"notes" | "assessment" | "flashcards" | "question-bank" | "lesson-plan" | "video" | "ppt" | "exam-paper" | "">("");
  const [resultText, setResultText] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [accountPanelTab, setAccountPanelTab] = useState<"profile" | "security" | "about" | "logout">("profile");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("notivexa_sidebar_collapsed") !== "false";
    } catch {
      return true;
    }
  });
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("notivexa_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };
  const [pptTheme, setPptTheme] = useState<"academic" | "professional" | "minimalist" | "pastel">("academic");
  const [resultType, setResultType] = useState<"notes" | "assessment" | "question-bank" | "lesson-plan" | "video" | "ppt" | "exam-paper" | "">("");
  const [videoData, setVideoData] = useState<VideoData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [flashcards, setFlashcards] = useState<{term: string, definition: string}[]>([]);
  const [lessonPlan, setLessonPlan] = useState<{
    duration: string;
    totalSessions: string;
    sessions: {
      name: string;
      duration: string;
      description: string;
      objectives: string[];
      activities: string[];
    }[];
    fullMarkdownPlan: string;
  }
 | null>(null);
  const [completedSessions, setCompletedSessions] = useState<Record<string, boolean>>({});
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [handwritingFont, setHandwritingFont] = useState("font-handwriting");
  const [flashcardThemeStyle, setFlashcardThemeStyle] = useState<"default" | "monochrome" | "pastel" | "high-contrast">("pastel");
  const [pageStyle, setPageStyle] = useState("ruled");
  const [penColor, setPenColor] = useState("blue");
  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState("");
  const [focusArea, setFocusArea] = useState("Algorithms, step-by-step processes, and diagrams in student style");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
    const [questionBankType, setQuestionBankType] = useState("all");
    const [examPaperType, setExamPaperType] = useState("paper-full");
    const [universityMarks, setUniversityMarks] = useState<number>(60);
  const [questionBankBloomLevel, setQuestionBankBloomLevel] = useState("all");

  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eduSmart_darkMode") === "true";
    }

    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("eduSmart_darkMode", "true");
    }
 else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("eduSmart_darkMode", "false");
    }

  }, [isDarkMode]);



  // High-Capacity Book Library and Live Camera Scanner State
  const [inputType, setInputType] = useState<"upload" | "library" | "scan">("upload");
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const notesRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Library UI state
  const [selectedDept, setSelectedDept] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const defaultLibraryBooks = [
    // Classical books for backwards compatibility
    { id: "book:gatsby", title: "The Great Gatsby", author: "F. Scott Fitzgerald", desc: "A detailed exploration of wealth, love, obsession, and the American Dream.", department: "Arts" },
    { id: "book:frankenstein", title: "Frankenstein", author: "Mary Shelley", desc: "A legendary sci-fi tale examining creation, scientific ambition, and isolation.", department: "Science" },
    { id: "book:sherlock_holmes", title: "The Adventures of Sherlock Holmes", author: "Arthur Conan Doyle", desc: "Classic detective mysteries showcasing brilliant deduction and case analysis.", department: "Arts" },
    { id: "book:alice_in_wonderland", title: "Alice's Adventures in Wonderland", author: "Lewis Carroll", desc: "A whimsical journey through nonsense, dreams, and linguistic puzzles.", department: "Arts" },
    { id: "book:pride_and_prejudice", title: "Pride & Prejudice", author: "Jane Austen", desc: "A brilliant romantic comedy about social status, pride, and assumptions.", department: "Arts" },
    { id: "book:macbeth", title: "Macbeth", author: "William Shakespeare", desc: "A masterpiece tragedy examining raw political ambition, guilt, and fate.", department: "Arts" },
    
    // MCA (Master of Computer Applications)
    { id: "book:distributed_systems", title: "Distributed Systems: Concepts and Design", author: "George Coulouris", desc: "Comprehensive coverage of distributed system architectures, peer-to-peer systems, middleware, consensus, and cloud algorithms.", department: "MCA" },
    { id: "book:advanced_db", title: "Advanced Database Management Systems", author: "Raghu Ramakrishnan", desc: "Deep dive into query optimization, transaction management, indexing, and NoSQL/distributed database technologies.", department: "MCA" },
    
    // BCA (Bachelor of Computer Applications)
    { id: "book:cpp_oop", title: "Programming in C++ and Object-Oriented Design", author: "Bjarne Stroustrup", desc: "Foundational principles of object-oriented programming, classes, inheritance, polymorphism, memory management, and C++ design.", department: "BCA" },
    { id: "book:computer_networks", title: "Computer Networks & Internet Protocols", author: "Andrew S. Tanenbaum", desc: "Detailed exploration of network layers, routing protocols, TCP/UDP, and application-layer services.", department: "BCA" },
    
    // Engineering
    { id: "book:artificial_intelligence", title: "Artificial Intelligence: A Modern Approach", author: "Stuart Russell & Peter Norvig", desc: "The definitive guide to rational agents, search, logic, machine learning, neural networks, and agent architectures.", department: "Engineering" },
    { id: "book:engineering_math", title: "Advanced Engineering Mathematics", author: "Erwin Kreyszig", desc: "Fourier analysis, partial differential equations, complex analysis, linear algebra, and numerical engineering methods.", department: "Engineering" },
    { id: "book:fluid_mechanics", title: "Fluid Mechanics & Thermodynamics", author: "Frank M. White", desc: "Fundamental principles of fluid properties, fluid statics, control volume analysis, pipe flow, drag, and lift.", department: "Engineering" },
    
    // Pharmacy
    { id: "book:medical_pharmacology", title: "Essentials of Medical Pharmacology", author: "K.D. Tripathi", desc: "Comprehensive drug actions, mechanisms, pharmacokinetics (ADME), clinical therapeutics, and toxicities.", department: "Pharmacy" },
    { id: "book:pharmaceutics", title: "Pharmaceutics: Formulations and Drug Delivery", author: "Michael E. Aulton", desc: "Dosage form design, biopharmaceutics, drug stability, physical pharmacy, and industrial manufacturing.", department: "Pharmacy" },
    
    // Commerce
    { id: "book:corporate_finance", title: "Principles of Corporate Finance", author: "Richard A. Brealey & Stewart C. Myers", desc: "Valuation models, capital budgeting, risk management, capital structure, and financial decision-making.", department: "Commerce" },
    { id: "book:financial_accounting", title: "Advanced Financial Accounting", author: "Theodore E. Christensen", desc: "Consolidations, foreign currency transactions, partnerships, segment reporting, and reporting standards.", department: "Commerce" },
    
    // Science
    { id: "book:brief_history_time", title: "A Brief History of Time & Cosmology", author: "Stephen Hawking", desc: "A journey through space-time, black holes, the big bang, quantum mechanics, and the search for a unified physical theory.", department: "Science" },
    { id: "book:organic_chemistry", title: "Organic Chemistry: Structure and Reactivity", author: "Robert T. Morrison & Robert N. Boyd", desc: "Detailed chemical structures, reaction mechanisms (substitution, elimination), synthesis pathways, and spectroscopy.", department: "Science" },
    
    // Arts
    { id: "book:story_of_art", title: "The Story of Art & Visual History", author: "E.H. Gombrich", desc: "The classic survey of art history, from prehistoric cave paintings and classical eras to Renaissance, Modern, and contemporary arts.", department: "Arts" },
    { id: "book:history_western_philosophy", title: "A History of Western Philosophy", author: "Bertrand Russell", desc: "A comprehensive analysis of philosophical thought from the pre-Socratics to 20th-century analytical philosophy.", department: "Arts" }
  ];

  const allLibraryBooks = defaultLibraryBooks;
  const libraryBooks = allLibraryBooks;

  const getActiveBook = () => {
    if (!fileData || !fileData.fileUri) return null;
    return allLibraryBooks.find(b => b.id === fileData.fileUri || ((b as any).fileUri && (b as any).fileUri === fileData.fileUri));
  };

  const startCamera = async () => {
    setCameraError(null);
    setIsCameraLoading(true);
    setCapturedPhoto(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setCameraStream(stream);
      // Wait for React to render the video element and stream
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

      }, 100);
    }
 catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Could not access camera. Please verify camera permissions or try on a device with a webcam.");
    }
 finally {
      setIsCameraLoading(false);
    }

  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }

  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      setCapturedPhoto(dataUrl);
      stopCamera();
    }

  };

  const confirmScan = async () => {
    if (!capturedPhoto) return;
    setLoading(true);
    setError(null);
    setIsScannerOpen(false);
    
    try {
      const resBlob = await fetch(capturedPhoto);
      const blob = await resBlob.blob();
      const scannedFile = new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" });
      setFile(scannedFile);
      
      const formData = new FormData();
      formData.append("file", scannedFile);
      
      const uploadRes = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });
      const textResponse = await uploadRes.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (!uploadRes.ok) {
        throw new Error(data.error || "Failed to process scanned image");
      }

      
      setFileData({ fileUri: data.fileUri, mimeType: data.mimeType });
      setResultText("");
      setResultType("");
            setFlashcards([]);
    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setCapturedPhoto(null);
    }

  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setHistory([]);
      return;
    }

    setHistoryLoading(true);
    const q = query(
      collection(db, "users", user.uid, "documents"),
      orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: HistoryItem[] = [];
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        items.push({
          id: docSnapshot.id,
          title: data.title || "Untitled Document",
          type: data.type || "notes",
          fileUri: data.fileUri || "",
          mimeType: data.mimeType || "",
          resultText: data.resultText || "",

          flashcards: data.flashcards || [],
          lessonPlan: data.lessonPlan || null,
          focusArea: data.focusArea || "",
          createdAt: data.createdAt,
        });
      });
      setHistory(items);
      setHistoryLoading(false);
    }, (err) => {
      console.error("Error fetching document history:", err);
      setHistoryLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSelectHistoryItem = (item: HistoryItem) => {
    if (item.fileUri && (item.fileUri.startsWith("book:") || item.fileUri.startsWith("link:"))) {
      setInputType("library");
    }
 else if (item.title && item.title.startsWith("scan-")) {
      setInputType("scan");
    }
 else {
      setInputType("upload");
    }


    setFileData({ fileUri: item.fileUri, mimeType: item.mimeType });
    setResultText(item.resultText || "");
    setResultType(item.type as any);
        setFlashcards(item.flashcards || []);
    setLessonPlan(item.lessonPlan || null);
    setVideoData(item.videoData || null);
    if (item.focusArea) {
      setFocusArea(item.focusArea);
    }

  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "documents", id));
    }
 catch (err) {
      console.error("Error deleting document from history:", err);
    }

  };

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Store user data in Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          email: user.email,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (error) {
      console.error("Error signing in", error);
    }

  };

  const handleSignOut = () => {
    signOut(auth);
  };




  // Text-to-Speech logic
  const handlePlayPauseSpeech = () => {
    if (isSpeaking && !isSpeechPaused) {
      window.speechSynthesis.pause();
      setIsSpeechPaused(true);
    } else if (isSpeaking && isSpeechPaused) {
      window.speechSynthesis.resume();
      setIsSpeechPaused(false);
    } else {
      if (!resultText) return;
      // Strip markdown using a simple regex
      const plainText = resultText
        .replace(/---PAGE_BREAK---/g, " ")
        .replace(/---SET_SEPARATOR---/g, " ")
        .replace(/[*_#`~>]/g, "")
        .replace(/\[DIAGRAM:.*?\]/g, "Diagram omitted.")
        .replace(/\[.*?\]\(.*?\)/g, "Link omitted.");
      
      const utterance = new SpeechSynthesisUtterance(plainText);
      utterance.onend = () => {
        setIsSpeaking(false);
        setIsSpeechPaused(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsSpeechPaused(false);
      };
      
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsSpeechPaused(false);
    }
  };

  const handleStopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsSpeechPaused(false);
  };
  
  useEffect(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsSpeechPaused(false);
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [resultText]);

  if (authLoading) {
    return (
      <div className={`flex h-screen items-center justify-center transition-colors ${isDarkMode ? "bg-[#181816]" : "bg-[#F5F5F0]"}`}>
        <Loader2 className={`animate-spin ${isDarkMode ? "text-[#C2C2B0]" : "text-[#5A5A40]"}`} size={40} />
      </div>);
  }


  if (!user) {
    return (
      <div className={`flex min-h-screen items-center justify-center font-sans transition-colors relative overflow-hidden ${isDarkMode ? "academic-workspace-dark text-[#E0E0D5]" : "academic-workspace-light text-[#2D2D2A]"}`}>
        
        {/* Professional Academic Watermark & Grid Metadata */}
        <div className="absolute top-6 left-8 hidden md:flex items-center gap-2 select-none pointer-events-none opacity-40 text-[11px] font-mono tracking-wider uppercase">
          <GraduationCap size={14} />
          <span>Institutional Learning Portal &bull; ISO/IEC 23988 Compliant</span>
        </div>
        <div className="absolute bottom-6 right-8 hidden md:flex items-center gap-2 select-none pointer-events-none opacity-40 text-[11px] font-mono tracking-wider uppercase">
          <span>Curriculum Engineering Engine v2.0</span>
        </div>

        {/* Subtle Drafting Precision Corner Marks */}
        <div className="absolute top-6 right-8 hidden md:block select-none pointer-events-none opacity-30 text-xs font-mono">+</div>
        <div className="absolute bottom-6 left-8 hidden md:block select-none pointer-events-none opacity-30 text-xs font-mono">+</div>

        {/* Study Desk Reading Lamp in Login Background */}
        <div className="absolute top-8 right-16 hidden md:flex flex-col items-center pointer-events-none select-none opacity-75">
          <div className={`p-2.5 rounded-2xl border shadow-sm transition-colors ${
            isDarkMode ? "bg-[#22221F] border-[#383832] text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.15)]" : "bg-white border-amber-200 text-amber-600 shadow-sm"
          }`}>
            <LampDesk size={28} />
          </div>
          <div className={`w-32 h-44 -mt-1 bg-gradient-to-b ${
            isDarkMode ? "from-amber-400/20 via-amber-400/5 to-transparent blur-md" : "from-amber-300/30 via-amber-200/10 to-transparent blur-md"
          } rounded-b-full`} />
        </div>

        {/* Academic Books Stack in Login Background */}
        <div className="absolute bottom-10 left-12 hidden md:flex items-center gap-3 pointer-events-none select-none opacity-65">
          <div className={`p-2.5 rounded-2xl border shadow-2xs ${
            isDarkMode ? "bg-[#20201D] border-[#383832] text-indigo-400" : "bg-white border-slate-200 text-indigo-600"
          }`}>
            <Library size={26} />
          </div>
          <div className="font-mono text-[10px]">
            <span className="block font-bold text-slate-700 dark:text-slate-300">ACADEMIC VOLUMES</span>
            <span className="text-slate-400">Curriculum & Textbooks</span>
          </div>
        </div>

        {/* Formal Logical Symbols Floating in Margins */}
        <div className="absolute top-1/4 left-10 hidden lg:flex flex-col gap-2 font-mono text-xs text-slate-400/35 pointer-events-none select-none">
          <span>∀x ∈ S</span>
          <span>(P ⟹ Q)</span>
          <span>A ∧ B ⟺ C</span>
          <span>∴ Q.E.D.</span>
        </div>
        <div className="absolute bottom-1/4 right-10 hidden lg:flex flex-col items-end gap-2 font-mono text-xs text-slate-400/35 pointer-events-none select-none">
          <span>∑ 1/n² = π²/6</span>
          <span>∃y : y ∉ ∅</span>
          <span>¬(A ∨ B)</span>
          <span>∵ α ⊨ β</span>
        </div>

        <div className={`p-8 md:p-10 rounded-[32px] border text-center max-w-md w-full relative z-10 transition-colors backdrop-blur-xl my-8 ${
          isDarkMode ? "bg-[#1E1E1B]/90 border-[#383832] shadow-[0_8px_32px_rgba(0,0,0,0.5)]" : "bg-white/90 border-slate-200/90 shadow-[0_12px_40px_rgba(15,23,42,0.08)]"
        }`}>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            title={isDarkMode ? "Switch to Daylight Mode" : "Switch to Late-Night Study Dark Mode"}
            className={`absolute top-4 right-4 p-2.5 rounded-full border transition-all ${
              isDarkMode 
                ? "bg-[#2D2D2A] border-[#4A4A3F] text-[#FACC15] hover:bg-[#383832]" 
                : "bg-slate-50 border-slate-200 text-amber-600 hover:bg-slate-100"
            }`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 mb-5">
            <GraduationCap size={13} />
            Academic Workspace
          </div>

          <div className="w-16 h-16 mx-auto bg-gradient-to-tr from-sky-500 via-indigo-600 to-violet-600 rounded-[22px] shadow-lg shadow-indigo-500/25 text-white flex items-center justify-center mb-4 transform hover:scale-105 transition-all">
            <BookOpen size={30} />
          </div>
          <h1 className={`text-2xl md:text-3xl font-bold font-serif mb-2 tracking-tight ${isDarkMode ? "text-[#F5F5F0]" : "text-slate-900"}`}>
            Notivexa <span className="bg-gradient-to-r from-sky-500 to-violet-600 bg-clip-text text-transparent">AI 2.0</span>
          </h1>
          <p className={`mb-6 text-xs leading-relaxed ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
            Higher Education & Research Portal. Sign in to analyze curriculum texts, synthesize question papers, and produce interactive study materials.
          </p>
          <AuthForm isDarkMode={isDarkMode} />
          
          <div className="flex items-center my-6 opacity-70">
            <div className={`flex-1 border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}></div>
            <div className={`px-4 text-xs font-medium uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>Or continue with</div>
            <div className={`flex-1 border-t ${isDarkMode ? "border-slate-700" : "border-slate-200"}`}></div>
          </div>
          
          <button 
            onClick={handleSignIn}
            className={`w-full py-3.5 px-6 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
              isDarkMode
                ? "bg-[#2D2D2A] text-white hover:bg-[#383832] border border-slate-700"
                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>);
  }


  const handleFetchError = (err: any) => {
    console.error(err);
    const msg = err?.message || String(err || "");
    if (msg.includes("<!doctype html>") || msg.includes("DOCTYPE") || msg.includes("<html>")) {
      setError("The server is temporarily updating or busy. Please wait a moment and try clicking the button again.");
    }
 else if (msg.toLowerCase().includes("failed to fetch")) {
      setError("Network connection issue: Could not connect to the server. Please check your connection and try again.");
    }
 else if (msg.includes("503") || msg.toLowerCase().includes("overloaded") || msg.toLowerCase().includes("high demand")) {
      setError("The AI model is currently experiencing high demand. Please wait a moment and try again.");
    }
 else {
      setError(msg || "An unexpected error occurred");
    }

  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setResultText("");
    setResultType("");
        setFlashcards([]);
    setCurrentCardIndex(0);
    setIsFlipped(false);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch("/api/upload-pdf", {
        method: "POST",
        body: formData,
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload file");
      }

      
      setFileData({ fileUri: data.fileUri, mimeType: data.mimeType });

      if (user) {
        try {
          await addDoc(collection(db, "users", user.uid, "books"), {
            title: selectedFile.name,
            author: "Uploaded File",
            desc: "Uploaded via Quick Scan",
            department: "General",
            fileUri: data.fileUri,
            mimeType: data.mimeType,
            link: "",
            createdAt: serverTimestamp()
          });
        } catch (dbErr) {
          console.error("Failed to save to history:", dbErr);
        }
      }
    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
    }

  };



  const generateNotes = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("notes");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "notes");
      if (cached) {
        setResultText(cached.resultText || "");
        setResultType("notes");
                setFlashcards([]);
        if (cached.focusArea) {
          setFocusArea(cached.focusArea);
        }

        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: fileData.fileUri, mimeType: fileData.mimeType, focusArea: focusArea, mode: mode }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate notes");
      
      setResultText(data.result || "");
      setResultType("notes");
            setFlashcards([]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Study Notes",
          type: "notes",
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: data.result || "",

          flashcards: [],
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };

  const generateAssessment = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("assessment");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "assessment");
      if (cached) {
        setResultText(cached.resultText || "");
        setResultType("assessment");
                setFlashcards([]);
        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: fileData.fileUri, mimeType: fileData.mimeType, difficulty: "Medium", mode: mode }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate assessment");
      
      setResultText(data.result || "");
      setResultType("assessment");
            setFlashcards([]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Assessment Paper",
          type: "assessment",
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: data.result || "",

          flashcards: [],
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };

  const generateQuestionBank = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("question-bank");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "question-bank" && item.questionBankType === questionBankType && item.questionBankBloomLevel === questionBankBloomLevel);
      if (cached) {
        setResultText(cached.resultText || "");
        setResultType("question-bank");
                setFlashcards([]);
        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: fileData.fileUri, mimeType: fileData.mimeType, questionType: questionBankType, bloomLevel: questionBankBloomLevel, mode: mode }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate question bank");
      
      setResultText(data.result || "");
      setResultType("question-bank");
            setFlashcards([]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Question Bank",
          type: "question-bank",
          questionBankType: questionBankType,
          questionBankBloomLevel: questionBankBloomLevel,
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: data.result || "",

          flashcards: [],
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };



  const downloadCSV = () => {
    if (flashcards.length === 0) return;
    
    const csvRows = [];
    for (const card of flashcards) {
      const term = `"${card.term.replace(/"/g, '""')}"`;
      const definition = `"${card.definition.replace(/"/g, '""')}"`;
      csvRows.push(`${term},${definition}`);
    }

    
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateLessonPlan = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("lesson-plan");
    setError(null);
    try {
      // Client-side cache check
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "lesson-plan");
      if (cached && cached.lessonPlan) {
        setLessonPlan(cached.lessonPlan);
        setResultText(cached.lessonPlan.fullMarkdownPlan || "");
        setResultType("lesson-plan");
                setFlashcards([]);
        if (cached.focusArea) {
          setFocusArea(cached.focusArea);
        }

        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileUri: fileData.fileUri, 
          mimeType: fileData.mimeType, 
          focusArea: focusArea,
          role: mode
        }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate lesson plan");
      
      const plan = data.lessonPlan;
      setLessonPlan(plan);
      setResultText(plan.fullMarkdownPlan || "");
      setResultType("lesson-plan");
            setFlashcards([]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Study Lesson Plan",
          type: "lesson-plan",
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: plan.fullMarkdownPlan || "",

          flashcards: [],
          lessonPlan: plan,
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };

  const generateFlashcards = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("flashcards");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "flashcards");
      if (cached) {
        setFlashcards(cached.flashcards || []);
        setCurrentCardIndex(0);
        setIsFlipped(false);
        setResultText("");
                setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: fileData.fileUri, mimeType: fileData.mimeType, mode: mode }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate flashcards");
      
      setFlashcards(data.flashcards || []);
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setResultText("");
      
      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Flashcard Set",
          type: "flashcards",
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: "",

          flashcards: data.flashcards || [],
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };




  const downloadPPT = async () => {
    try {
      const pptxgen = (await import('pptxgenjs')).default;
      const pres = new pptxgen();

      // Define master slide layout based on theme
      let bgColor = "FDFBF7"; // Academic
      let accentColor = "E11D48";
      let fontName = "Times New Roman";
      let titleColor = "0F172A";
      let contentColor = "334155";
      
      if (pptTheme === "professional") {
        bgColor = "FFFFFF";
        accentColor = "2563EB"; // Blue
        fontName = "Arial";
        titleColor = "1E293B";
        contentColor = "475569";
      } else if (pptTheme === "minimalist") {
        bgColor = "F8FAFC";
        accentColor = "000000";
        fontName = "Helvetica";
        titleColor = "000000";
        contentColor = "000000";
      } else if (pptTheme === "pastel") {
        bgColor = "FEF2F2"; // Soft rose
        accentColor = "FBCFE8"; // Soft pink
        fontName = "Helvetica";
        titleColor = "831843"; // Deep pink/rose for contrast
        contentColor = "9D174D";
      }

      const objects: any[] = [];
      if (pptTheme === "academic" || pptTheme === "professional") {
        objects.push({ rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: accentColor } } });
        objects.push({ rect: { x: 0, y: "96%", w: "100%", h: 0.05, fill: { color: accentColor } } });
      }
      objects.push({ text: { text: "Notivexa AI Presentation", options: { x: 0.5, y: "96.5%", w: 3, h: 0.2, fontSize: 10, fontFace: fontName, color: "888888" } } });

      pres.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: { color: bgColor },
        objects: objects,
        slideNumber: { x: "95%", y: "96.5%", color: "888888", fontFace: fontName, fontSize: 10 }
      });

      slides.forEach((slide) => {
        const pptSlide = pres.addSlide({ masterName: "MASTER_SLIDE" });
        
        // Title
        pptSlide.addText(slide.title, {
          x: 0.5,
          y: 0.4,
          w: "90%",
          h: 1.2,
          fontSize: 44,
          fontFace: fontName,
          bold: true,
          color: titleColor,
          valign: "middle"
        });

        // Content
        if (slide.bullets && slide.bullets.length > 0) {
          pptSlide.addText(
            slide.bullets.map(b => ({ text: b, options: { bullet: true, fontSize: 24, fontFace: fontName, color: contentColor, breakLine: true } })),
            {
              x: 0.5,
              y: 1.8,
              w: "90%",
              h: 3.5,
              valign: "top",
              lineSpacing: 32,
              margin: [0, 0, 0, 0]
            }
          );
        }


      });
      
      pres.writeFile({ fileName: `NotivexaAI_Presentation.pptx` });
    } catch (error) {
      console.error("Error creating PPTX", error);
      alert("Failed to create PPTX file.");
    }
  };
  const generateExamPaper = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("exam-paper");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "question-bank" && item.questionBankType === examPaperType && item.questionBankBloomLevel === questionBankBloomLevel);
      if (cached) {
        setResultText(cached.resultText || "");
        setResultType("exam-paper");
                setFlashcards([]);
        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileUri: fileData.fileUri, mimeType: fileData.mimeType, questionType: examPaperType, bloomLevel: questionBankBloomLevel, mode: mode, totalMarks: examPaperType === "paper-university" ? universityMarks : undefined }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate question bank");
      
      setResultText(data.result || "");
      setResultType("exam-paper");
            setFlashcards([]);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Question Bank",
          type: "question-bank",
          questionBankType: examPaperType,
          questionBankBloomLevel: questionBankBloomLevel,
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: data.result || "",

          flashcards: [],
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };



  const generatePPT = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("ppt");
    setError(null);

    try {
      // Client-side cache check
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "ppt"
      );
      if (cached) {
        setSlides(cached.slides || []);
        setResultType("ppt");
        setLoading(false);
        setGeneratingType("");
        return;
      }

      const response = await fetch("/api/generate-ppt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          focusArea: selectedDept !== "All" ? selectedDept : "",
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to generate PPT");
      }

      const data = await response.json();
      if (data.ppt && data.ppt.slides) {
        setSlides(data.ppt.slides);
        setResultType("ppt");

        if (user) {
          await addDoc(collection(db, "users", user.uid, "documents"), {
            title: file ? file.name : "Presentation Slides",
            type: "ppt",
            fileUri: fileData.fileUri,
            mimeType: fileData.mimeType,
            resultText: "",
            flashcards: [],
            slides: data.ppt.slides,
            focusArea: selectedDept !== "All" ? selectedDept : "",
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err: any) {
      handleFetchError(err);
    } finally {
      setLoading(false);
      setGeneratingType("");
    }
  };
  const generateVideoExplanation = async () => {
    if (!fileData) return;
    setLoading(true);
    setGeneratingType("video");
    setError(null);
    try {
      // Client-side cache check to prevent double API calls & save quota
      const cached = history.find(
        (item) => item.fileUri === fileData.fileUri && item.type === "video");
      if (cached) {
        setVideoData(cached.videoData || null);
        setResultType("video");
        setResultText("");
                setFlashcards([]);
        setLessonPlan(null);
        setLoading(false);
        setGeneratingType("");
        return;
      }


      const res = await fetch("/api/generate-video-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          fileUri: fileData.fileUri, 
          mimeType: fileData.mimeType,
          focusArea: focusArea
        }),
      });
      const textResponse = await res.text();
      let data;
      try {
        data = JSON.parse(textResponse.trim());
      }
 catch (e) {
        if (textResponse.trim().toLowerCase().startsWith("<!doctype html>")) { throw new Error("Server is temporarily unavailable (restarting). Please try again in a few seconds."); } throw new Error(`Server error: ${textResponse.slice(0, 100)}`);
      }

      
      if (data && data.error) throw new Error(data.error);
      if (!res.ok) throw new Error("Failed to generate video explanation");
      
      setVideoData(data.video || null);
      setResultType("video");
      setResultText("");
            setFlashcards([]);
      setLessonPlan(null);

      if (user) {
        await addDoc(collection(db, "users", user.uid, "documents"), {
          title: file ? file.name : "Lecture Video",
          type: "video",
          fileUri: fileData.fileUri,
          mimeType: fileData.mimeType,
          resultText: "",

          flashcards: [],
          videoData: data.video || null,
          focusArea: focusArea,
          createdAt: serverTimestamp()
        });
      }

    }
 catch (err: any) {
      handleFetchError(err);
    }
 finally {
      setLoading(false);
      setGeneratingType("");
    }

  };


  const downloadMarkdown = () => {
    if (!resultText) return;
    const blob = new Blob([resultText], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${file ? file.name.replace(/\.[^/.]+$/, "") : "Notivexa"}_Notes.md`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const downloadDoc = () => {
    if (!notesRef.current) return;
    const htmlContent = notesRef.current.innerHTML;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Export HTML to Word Document</title>
      <style>
        body { font-family: 'Arial', sans-serif; }
        h1, h2, h3, h4, h5, h6 { color: #2d2d2a; }
        p, li { color: #3a3a2f; }
        svg { display: none; }
      </style>
    </head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + htmlContent + footer;
    
    const blob = new Blob(['\ufeff', sourceHTML], {
        type: 'application/msword'
    });
    const url = URL.createObjectURL(blob);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = url;
    fileDownload.download = `${file ? file.name.replace(/\.[^/.]+$/, "") : "Notivexa"}_Notes.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };
  const downloadHandwrittenPDF = async (fast: boolean = false) => {
    if (!notesRef.current) return;
    
    const originalGetComputedStyle = window.getComputedStyle;
    
    // Temporarily monkeypatch window.getComputedStyle to translate OKLCH colors to RGB/RGBA
    // because html2canvas does not support oklch() color spaces used by Tailwind v4.
    window.getComputedStyle = function (elt, pseudoElt) {
      const style = originalGetComputedStyle(elt, pseudoElt);
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function (propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && val.includes('oklch')) {
                return val.replace(/oklch\(\s*[\d\.]+%?\s+[\d\.]+\s+[\d\.]+(?:\s*\/\s*[\d\.]+%?)?\s*\)/gi, (m) => oklchToRgb(m));
              }

              return val;
            };
          }

          
          const val = (target as any)[prop];
          if (typeof val === 'string' && val.includes('oklch')) {
            return val.replace(/oklch\(\s*[\d\.]+%?\s+[\d\.]+\s+[\d\.]+(?:\s*\/\s*[\d\.]+%?)?\s*\)/gi, (m) => oklchToRgb(m));
          }

          if (typeof val === 'function') {
            return val.bind(target);
          }

          return val;
        }

      });
    };
    
    try {
      setIsExporting(true);
      setExportProgress(5);
      setExportStatus("Initializing pagination layout and preparing font canvases...");
      
      // Wait for fonts to be ready
      await document.fonts.ready;
      setExportProgress(15);
      setExportStatus("Positioning document nodes and formatting pages...");
      
      const element = notesRef.current;
      
      let elementsToPaginate: Element[] = [];
      const markdownContents = element.querySelectorAll('.markdown-content');
      if (markdownContents.length > 0) {
        markdownContents.forEach(container => {
          elementsToPaginate.push(...Array.from(container.children));
        });
      }
 else {
        const contentContainer = element.querySelector('.pl-8') || element;
        elementsToPaginate = Array.from(contentContainer.children);
      }

      
      const isStudent = mode === 'student';
      
      // Create a temporary workspace attached to the document body (positioned offscreen)
      const tempWorkspace = document.createElement("div");
      tempWorkspace.style.position = "absolute";
      tempWorkspace.style.top = "0";
      tempWorkspace.style.left = "-9999px";
      tempWorkspace.style.width = "794px";
      tempWorkspace.style.zIndex = "-9999";
      document.body.appendChild(tempWorkspace);
      
      const pageClass = `prose max-w-none ${isStudent ? `${handwritingFont} text-xl ${penColor === 'blue' ? 'text-[#1d4ed8]' : 'text-[#3A3A2F]'}` : 'font-sans text-[#4A4A3F]'}`;
      
      // Setup the first page
      let currentPage = document.createElement("div");
      currentPage.className = pageClass;
      Object.assign(currentPage.style, {
        width: "794px",
        minHeight: "1123px",
        maxHeight: "1123px",
        padding: isStudent ? "60px 40px 60px 80px" : "60px 60px 60px 60px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        backgroundColor: isStudent ? "#FDFDFB" : "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      });
      
      if (isStudent) {
        currentPage.style.backgroundImage = pageStyle === 'ruled' 
          ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
          : pageStyle === 'box' 
            ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)'
            : 'none';
        currentPage.style.backgroundAttachment = 'local';
        currentPage.style.lineHeight = '32px';
      }

      
      const addDecorations = (pageElem: HTMLElement) => {
        if (isStudent) {
          if (pageStyle !== 'box') {
            const redLine = document.createElement("div");
            redLine.className = "absolute left-10 top-0 bottom-0 w-px bg-[#fee2e2]";
            pageElem.appendChild(redLine);
          }

          const dotsContainer = document.createElement("div");
          dotsContainer.className = "absolute bottom-8 right-10 flex gap-2";
          dotsContainer.innerHTML = `
            <div class="w-2 h-2 rounded-full bg-[#bfdbfe]"></div>
            <div class="w-2 h-2 rounded-full bg-[#dbeafe]"></div>
          `;
          pageElem.appendChild(dotsContainer);
        }

      };
      
      addDecorations(currentPage);
      
      let currentContentWrapper = document.createElement("div");
      currentContentWrapper.className = isStudent ? "pl-8 block relative z-10" : "block relative z-10";
      currentContentWrapper.style.maxWidth = "100%";
      currentContentWrapper.style.boxSizing = "border-box";
      currentPage.appendChild(currentContentWrapper);
      
      tempWorkspace.appendChild(currentPage);
      const pages: HTMLElement[] = [currentPage];
      
      setExportProgress(30);
      setExportStatus("Distributing page contents...");
      
      // We will iterate and place child nodes on pages
      for (const child of elementsToPaginate) {
        // Skip some container wrappers if they are empty
        if (child.tagName.toLowerCase() === 'div' && child.children.length === 0 && !child.textContent?.trim()) {
          continue;
        }

        
        const tagName = child.tagName?.toLowerCase() || '';
        const hasPageBreakClass = child.classList?.contains('page-break-before') || child.querySelector?.('.page-break-before') !== null;
        // Check if this child is a primary section header (h1 or h2) or contains one
        const isHighLevelHeading = tagName === 'h1' || child.querySelector?.('h1') !== null;
        
        // Force page break proactively if a major heading/section or custom break class is met, but only if we already have content on the current page
        const shouldForcePageBreak = (isHighLevelHeading || hasPageBreakClass) && currentContentWrapper.children.length > 0;
        
        if (shouldForcePageBreak) {
          currentPage = document.createElement("div");
          currentPage.className = pageClass;
          Object.assign(currentPage.style, {
            width: "794px",
            minHeight: "1123px",
            maxHeight: "1123px",
            padding: isStudent ? "60px 40px 60px 80px" : "60px 60px 60px 60px",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            backgroundColor: isStudent ? "#FDFDFB" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          });
          
          if (isStudent) {
            currentPage.style.backgroundImage = pageStyle === 'ruled' 
              ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
              : pageStyle === 'box' 
                ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)'
                : 'none';
            currentPage.style.backgroundAttachment = 'local';
            currentPage.style.lineHeight = '32px';
          }

          
          addDecorations(currentPage);
          
          currentContentWrapper = document.createElement("div");
          currentContentWrapper.className = isStudent ? "pl-8 block relative z-10" : "block relative z-10";
          currentContentWrapper.style.maxWidth = "100%";
          currentContentWrapper.style.boxSizing = "border-box";
          currentPage.appendChild(currentContentWrapper);
          
          tempWorkspace.appendChild(currentPage);
          pages.push(currentPage);
        }

        
        const clonedChild = child.cloneNode(true) as HTMLElement;
        
        // Ensure child contents are sized properly
        const childElements = clonedChild.querySelectorAll('pre, table, svg, img');
        childElements.forEach(el => {
          (el as HTMLElement).style.maxWidth = '100%';
          (el as HTMLElement).style.boxSizing = 'border-box';
        });
        
        currentContentWrapper.appendChild(clonedChild);
        
        // Measure height of content in the wrapper
        const currentHeight = currentContentWrapper.scrollHeight;
        const maxHeightAllowed = 940; // leaving margin for top/bottom padding
        
        if (currentHeight > maxHeightAllowed && currentContentWrapper.children.length > 1) {
          // Doesn't fit on this page, remove it and start a new page
          currentContentWrapper.removeChild(clonedChild);
          
          currentPage = document.createElement("div");
          currentPage.className = pageClass;
          Object.assign(currentPage.style, {
            width: "794px",
            minHeight: "1123px",
            maxHeight: "1123px",
            padding: isStudent ? "60px 40px 60px 80px" : "60px 60px 60px 60px",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
            backgroundColor: isStudent ? "#FDFDFB" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          });
          
          if (isStudent) {
            currentPage.style.backgroundImage = pageStyle === 'ruled' 
              ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
              : pageStyle === 'box' 
                ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)'
                : 'none';
            currentPage.style.backgroundAttachment = 'local';
            currentPage.style.lineHeight = '32px';
          }

          
          addDecorations(currentPage);
          
          currentContentWrapper = document.createElement("div");
          currentContentWrapper.className = isStudent ? "pl-8 block relative z-10" : "block relative z-10";
          currentContentWrapper.style.maxWidth = "100%";
          currentContentWrapper.style.boxSizing = "border-box";
          currentPage.appendChild(currentContentWrapper);
          
          tempWorkspace.appendChild(currentPage);
          pages.push(currentPage);
          
          // Add to the new page
          currentContentWrapper.appendChild(clonedChild);
        }

      }


      // Extract all headings from content pages
      const allHeadings: { text: string; level: number; contentPageIdx: number }[] = [];
      pages.forEach((page, pageIdx) => {
        const headingsOnPage = page.querySelectorAll('h1, h2, h3');
        headingsOnPage.forEach(h => {
          const hTag = h.tagName.toLowerCase();
          const txt = h.textContent?.trim() || '';
          if (txt) {
            allHeadings.push({
              text: txt,
              level: parseInt(hTag.substring(1)),
              contentPageIdx: pageIdx
            });
          }

        });
      });

      // Format Table of Contents Page
      const tocPage = document.createElement("div");
      tocPage.className = pageClass;
      Object.assign(tocPage.style, {
        width: "794px",
        minHeight: "1123px",
        maxHeight: "1123px",
        padding: isStudent ? "60px 40px 60px 80px" : "60px 60px 60px 60px",
        boxSizing: "border-box",
        position: "relative",
        overflow: "hidden",
        backgroundColor: isStudent ? "#FDFDFB" : "#ffffff",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      });

      if (isStudent) {
        tocPage.style.backgroundImage = pageStyle === 'ruled' 
          ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
          : pageStyle === 'box' 
            ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)'
            : 'none';
        tocPage.style.backgroundAttachment = 'local';
        tocPage.style.lineHeight = '32px';
      }


      addDecorations(tocPage);

      const tocContentWrapper = document.createElement("div");
      tocContentWrapper.className = isStudent ? "pl-8 flex flex-col gap-6 relative z-10" : "flex flex-col gap-6 relative z-10";
      tocContentWrapper.style.maxWidth = "100%";
      tocContentWrapper.style.boxSizing = "border-box";
      tocPage.appendChild(tocContentWrapper);

      const tocTitle = document.createElement("div");
      if (isStudent) {
        tocTitle.className = `text-3xl font-bold border-b pb-2 ${penColor === 'blue' ? 'border-[#bfdbfe] text-[#1d4ed8]' : 'border-gray-200 text-gray-800'}`;
        if (handwritingFont) {
          tocTitle.style.fontFamily = handwritingFont;
        }

        tocTitle.textContent = "Table of Contents";
      }
 else {
        tocTitle.className = "text-2xl font-sans font-bold text-gray-900 border-b border-gray-200 pb-2";
        tocTitle.textContent = "Table of Contents";
      }

      tocContentWrapper.appendChild(tocTitle);

      // Adaptive filtering of headings to prevent overflow on 1 page (limit to max 22 entries)
      let filteredHeadings = allHeadings;
      if (filteredHeadings.length > 22) {
        filteredHeadings = allHeadings.filter(h => h.level <= 2);
        if (filteredHeadings.length > 22) {
          filteredHeadings = allHeadings.filter(h => h.level === 1);
          if (filteredHeadings.length > 22) {
            filteredHeadings = filteredHeadings.slice(0, 22);
          }

        }

      }


      const tocListContainer = document.createElement("div");
      tocListContainer.className = "flex flex-col gap-4";
      tocListContainer.style.width = "100%";

      if (filteredHeadings.length === 0) {
        const noHeadings = document.createElement("div");
        noHeadings.className = "text-gray-400 italic text-sm";
        noHeadings.textContent = "No sections to display.";
        tocListContainer.appendChild(noHeadings);
      }
 else {
        filteredHeadings.forEach(heading => {
          const entryRow = document.createElement("div");
          entryRow.className = "flex items-baseline justify-between w-full";
          
          let paddingLeft = "0px";
          let fontSize = isStudent ? "18px" : "15px";
          let fontWeight = "normal";
          let colorClass = "text-gray-700";
          
          if (heading.level === 1) {
            paddingLeft = "0px";
            fontSize = isStudent ? "20px" : "16px";
            fontWeight = "bold";
            colorClass = isStudent 
              ? (penColor === 'blue' ? 'text-[#1d4ed8]' : 'text-gray-900') 
              : 'text-gray-900';
          }
 else if (heading.level === 2) {
            paddingLeft = "24px";
            fontSize = isStudent ? "18px" : "14px";
            fontWeight = "medium";
            colorClass = "text-gray-800";
          }
 else if (heading.level === 3) {
            paddingLeft = "48px";
            fontSize = isStudent ? "16px" : "13px";
            colorClass = "text-gray-600";
          }

          
          entryRow.style.paddingLeft = paddingLeft;
          entryRow.style.fontSize = fontSize;
          if (isStudent && handwritingFont) {
            entryRow.style.fontFamily = handwritingFont;
          }

          
          const titleSpan = document.createElement("span");
          titleSpan.className = `${fontWeight === 'bold' ? 'font-bold' : fontWeight === 'medium' ? 'font-medium' : 'font-normal'} ${colorClass}`;
          titleSpan.textContent = heading.text;
          
          const dotsSpan = document.createElement("span");
          dotsSpan.className = "flex-1 border-b border-dotted mx-2";
          if (isStudent && penColor === 'blue') {
            dotsSpan.className += " border-[#bfdbfe]";
          }
 else {
            dotsSpan.className += " border-gray-300";
          }

          dotsSpan.style.marginBottom = "4px";
          
          const pageSpan = document.createElement("span");
          pageSpan.className = `font-bold ${colorClass}`;
          pageSpan.textContent = String(heading.contentPageIdx + 2); // Shift by 1 for 1-based index and by 1 for TOC page itself
          
          entryRow.appendChild(titleSpan);
          entryRow.appendChild(dotsSpan);
          entryRow.appendChild(pageSpan);
          
          tocListContainer.appendChild(entryRow);
        });
      }


      tocContentWrapper.appendChild(tocListContainer);

      // Insert TOC page as the first page of the temp workspace and pages list
      tempWorkspace.insertBefore(tocPage, tempWorkspace.firstChild);
      pages.unshift(tocPage);

      // Function to dynamically append beautifully styled page numbers to each page
      const addPageNumber = (pageElem: HTMLElement, pageNum: number) => {
        if (isStudent) {
          const pageNumDiv = document.createElement("div");
          pageNumDiv.className = `absolute bottom-6 left-12 text-xs font-semibold ${penColor === 'blue' ? 'text-[#3b82f6]' : 'text-gray-400'}`;
          if (handwritingFont) {
            pageNumDiv.style.fontFamily = handwritingFont;
          }

          pageNumDiv.textContent = `Page ${pageNum}`;
          pageElem.appendChild(pageNumDiv);
        }
 else {
          const pageNumDiv = document.createElement("div");
          pageNumDiv.className = "absolute bottom-6 left-10 right-10 flex justify-between text-xs text-gray-400 border-t border-gray-100 pt-2";
          pageNumDiv.innerHTML = `
            <span>EDU-SMART ACADEMIC PORTAL</span>
            <span>Page ${pageNum}</span>
          `;
          pageElem.appendChild(pageNumDiv);
        }

      };

      // Add page numbers to all formatted pages (including TOC page itself)
      pages.forEach((page, idx) => {
        addPageNumber(page, idx + 1);
      });
      
      // Format SVG elements on each page to make sure they render clearly
      pages.forEach(page => {
        const svgElements = page.querySelectorAll('svg');
        svgElements.forEach(svg => {
          const s = svg as any;
          const bbox = s.getBoundingClientRect();
          if (bbox.width && bbox.height) {
            s.setAttribute('width', bbox.width + 'px');
            s.setAttribute('height', bbox.height + 'px');
          }

          s.style.maxWidth = '100%';
          s.style.height = 'auto';
          s.style.display = 'block';
          s.style.margin = '0 auto';
        });
      });
      
      setExportProgress(45);
      setExportStatus(`Rasterizing formatted pages (0 of ${pages.length})...`);
      
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      const numPages = pages.length;
      for (let i = 0; i < numPages; i++) {
        const pageElem = pages[i];
        
        setExportProgress(Math.round(45 + (i / numPages) * 45));
        setExportStatus(`Rasterizing page ${i + 1} of ${numPages}...`);
        
        const canvas = await html2canvas(pageElem, {
          scale: fast ? 1.0 : 3.0, // Optimized scale
          useCORS: true,
          backgroundColor: isStudent ? "#FDFDFB" : "#ffffff",
          width: 794,
          height: 1123,
        });
        
        const imgData = canvas.toDataURL("image/jpeg", 0.8); // Use JPEG with lower quality to reduce size
        
        if (i > 0) {
          pdf.addPage();
        }

        
        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pageHeight);
      }

      
      // Cleanup the temporary workspace
      document.body.removeChild(tempWorkspace);
      
      setExportProgress(95);
      setExportStatus("Finalizing PDF structure and saving...");
      
      pdf.save("Student_Notes.pdf");
      setExportProgress(100);
      setExportStatus("Export Complete!");
    }
 catch (err: any) {
      console.error("PDF export failed:", err);
      window.print();
    }
 finally {
      window.getComputedStyle = originalGetComputedStyle;
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportStatus("");
      }, 800);
    }

  };


  return (
    <div className={`flex h-screen font-sans transition-colors duration-300 ${isDarkMode ? "academic-workspace-dark text-[#E0E0D5] dark" : "academic-workspace-light text-slate-800"}`}>
      
      {/* Mobile Menu Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Floating Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md text-slate-700 dark:text-slate-200 cursor-pointer"
        aria-label="Toggle navigation menu"
      >
        <Menu size={20} />
      </button>

      {/* Hidden File Input for Sidebar Upload */}
      <input
        id="sidebar-file-upload-input"
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={handleUpload}
      />

      {/* ========================================================================= */}
      {/* NOTIVEXA AI — ICON-ONLY COLLAPSED / EXPANDABLE SIDEBAR                     */}
      {/* Default: 80px (w-20). Expanded: 288px (w-72). Full Height & Tooltips      */}
      {/* ========================================================================= */}
      <div className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col h-full transition-all duration-300 ease-in-out border-r shrink-0 select-none ${
        sidebarCollapsed ? "w-20" : "w-72"
      } ${
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      } ${
        isDarkMode 
          ? "bg-[#181816]/95 border-[#2D2D27] text-[#E0E0D5]" 
          : "bg-white/95 backdrop-blur-md border-slate-200/80 text-slate-800 shadow-sm"
      }`}>
        
        {/* Collapse / Expand Floating Button (Edge of Sidebar) */}
        <button
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          aria-label={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-400 shadow-md items-center justify-center z-50 cursor-pointer transition-all hover:scale-110"
        >
          {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* 1. TOP / LOGO SECTION */}
        <div className={`h-20 shrink-0 border-b flex items-center transition-colors ${
          isDarkMode ? "border-[#2D2D27]" : "border-slate-200/80"
        } ${sidebarCollapsed ? "justify-center px-2" : "justify-between px-5"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0 transform hover:scale-105 transition-transform">
              <BookOpen size={22} />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-lg font-bold font-serif tracking-tight truncate text-slate-900 dark:text-white">
                  Notivexa <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent italic font-black">AI</span>
                </h1>
                <span className="text-[10px] text-slate-400 font-mono tracking-wider uppercase block">Workspace</span>
              </div>
            )}
          </div>
        </div>

        {/* 2. SCROLLABLE MIDDLE NAVIGATION CONTAINER */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2 min-h-0 custom-scrollbar">
          
          {/* GROUP 1: CORE SYNTHESIS ACTIONS */}
          <div className="space-y-1.5">
            {/* Generate Summary */}
            <button
              onClick={() => {
                if (fileData) {
                  generateNotes();
                } else {
                  setInputType("upload");
                  document.getElementById("sidebar-file-upload-input")?.click();
                }
              }}
              aria-label="Generate Summary"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                resultType === "notes"
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 font-semibold"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <FileText size={20} strokeWidth={resultType === "notes" ? 2.2 : 1.8} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  Generate Summary
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  Generate Summary
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>

            {/* Study Lesson Planner */}
            <button
              onClick={() => {
                if (fileData) {
                  generateLessonPlan();
                } else {
                  setInputType("upload");
                  document.getElementById("sidebar-file-upload-input")?.click();
                }
              }}
              aria-label="Study Lesson Planner"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                resultType === "lesson-plan"
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 font-semibold"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Calendar size={20} strokeWidth={resultType === "lesson-plan" ? 2.2 : 1.8} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  Study Lesson Planner
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  Study Lesson Planner
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>

            {/* Generate Flashcards */}
            <button
              onClick={() => {
                if (fileData) {
                  generateFlashcards();
                } else {
                  setInputType("upload");
                  document.getElementById("sidebar-file-upload-input")?.click();
                }
              }}
              aria-label="Generate Flashcards"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                flashcards.length > 0
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 font-semibold"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Layers size={20} strokeWidth={flashcards.length > 0 ? 2.2 : 1.8} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  Generate Flashcards
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  Generate Flashcards
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>
          </div>

          {/* SUBTLE DIVIDER */}
          <div className={`my-2 mx-1 h-[1px] ${isDarkMode ? "bg-[#2D2D27]" : "bg-slate-200/80"}`} />

          {/* GROUP 2: ACADEMIC TOOLS & REPOSITORIES */}
          <div className="space-y-1.5">
            {/* Exam Paper & Question Bank */}
            <button
              onClick={() => {
                if (fileData) {
                  generateExamPaper();
                } else {
                  setInputType("upload");
                  document.getElementById("sidebar-file-upload-input")?.click();
                }
              }}
              aria-label="Exam Paper and Question Bank"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                resultType === "exam-paper" || resultType === "question-bank" || resultType === "assessment"
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 font-semibold"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <GraduationCap size={20} strokeWidth={resultType === "exam-paper" ? 2.2 : 1.8} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  Exam Paper & Question Bank
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  Exam Paper & Question Bank
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>

            {/* Upload Syllabus / PDF */}
            <button
              onClick={() => {
                setInputType("upload");
                document.getElementById("sidebar-file-upload-input")?.click();
              }}
              aria-label="Upload Syllabus"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                inputType === "upload" && !resultText && !flashcards.length
                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-[#4F46E5] dark:text-indigo-300 font-semibold border border-indigo-200/60 dark:border-indigo-800/50"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Upload size={20} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  Upload Syllabus / PDF
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  Upload Syllabus / PDF
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>

            {/* University E-Library */}
            <button
              onClick={() => {
                setInputType("library");
              }}
              aria-label="University E-Library"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center px-0" : "px-3.5 gap-3"
              } ${
                inputType === "library"
                  ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-500/25 font-semibold"
                  : isDarkMode
                  ? "text-slate-300 hover:text-white hover:bg-slate-800/80"
                  : "text-slate-600 hover:text-[#4F46E5] hover:bg-[#EEF2FF]"
              } hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <Library size={20} strokeWidth={inputType === "library" ? 2.2 : 1.8} />
              </div>
              {!sidebarCollapsed && (
                <span className="text-xs sm:text-sm font-medium truncate text-left flex-1">
                  University E-Library
                </span>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  University E-Library
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>
          </div>

        </div>

        {/* 3. BOTTOM SECTION: SETTINGS, THEME & USER PROFILE */}
        <div className={`p-3 shrink-0 border-t flex flex-col gap-1.5 transition-colors ${
          isDarkMode ? "border-[#2D2D27] bg-[#161614]/60" : "border-slate-200/80 bg-slate-50/50"
        }`}>
          
          {/* Settings */}
          <button
            onClick={() => {
              setAccountPanelTab("profile");
              setAccountPanelOpen(true);
            }}
            aria-label="Settings"
            className={`group relative w-full h-10 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
              sidebarCollapsed ? "justify-center" : "px-3 gap-3"
            } ${
              isDarkMode
                ? "text-slate-400 hover:text-white hover:bg-slate-800/80"
                : "text-slate-500 hover:text-indigo-600 hover:bg-[#EEF2FF]"
            }`}
          >
            <Settings size={18} />
            {!sidebarCollapsed && (
              <span className="text-xs font-medium truncate">Settings</span>
            )}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                Settings
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
              </div>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            aria-label="Toggle theme"
            className={`group relative w-full h-10 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
              sidebarCollapsed ? "justify-center" : "px-3 gap-3"
            } ${
              isDarkMode
                ? "text-amber-400 hover:bg-slate-800/80"
                : "text-slate-500 hover:text-amber-500 hover:bg-amber-50/70"
            }`}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            {!sidebarCollapsed && (
              <span className="text-xs font-medium truncate">
                {isDarkMode ? "Daylight Mode" : "Late-Night Mode"}
              </span>
            )}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                Toggle theme
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
              </div>
            )}
          </button>

          {/* User Profile */}
          {user && (
            <button
              onClick={() => {
                setAccountPanelTab("profile");
                setAccountPanelOpen(true);
              }}
              aria-label="User profile"
              className={`group relative w-full h-11 rounded-xl transition-all duration-200 flex items-center cursor-pointer ${
                sidebarCollapsed ? "justify-center" : "px-2.5 gap-2.5"
              } ${
                isDarkMode ? "hover:bg-slate-800/80" : "hover:bg-slate-100"
              }`}
            >
              <div className="relative shrink-0">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="Profile" className="w-8 h-8 rounded-full object-cover ring-2 ring-indigo-500/20" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {user.displayName ? user.displayName.charAt(0).toUpperCase() : user.email ? user.email.charAt(0).toUpperCase() : "U"}
                  </div>
                )}
                <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-[#161614] rounded-full" />
              </div>
              {!sidebarCollapsed && (
                <div className="min-w-0 text-left flex-1 pr-1">
                  <span className={`text-xs font-bold block truncate ${isDarkMode ? "text-[#E0E0D5]" : "text-slate-800"}`}>
                    {user.displayName || user.email?.split("@")[0] || "Student"}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    Active Account
                  </span>
                </div>
              )}
              {sidebarCollapsed && (
                <div className="absolute left-full ml-3 px-3 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-lg shadow-xl whitespace-nowrap opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-150 pointer-events-none z-50">
                  {user.displayName || user.email || "User profile"}
                  <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-[#0F172A]" />
                </div>
              )}
            </button>
          )}

        </div>
      </div>
{/* Main Content Area */}
      <div className={`flex-1 overflow-auto p-8 relative transition-colors duration-300 ${isDarkMode ? "academic-workspace-dark text-[#E0E0D5]" : "academic-workspace-light text-slate-800"}`}>
        <div className="absolute top-4 right-4 z-20">
          <UserProfile user={user} isDarkMode={isDarkMode} onSignOut={handleSignOut} />
        </div>
        <div className="mb-8 relative z-10">
          <Chatbot fileUri={fileData?.fileUri} mimeType={fileData?.mimeType} isDarkMode={isDarkMode} embedded={false} />
        </div>
        <div className="max-w-4xl mx-auto space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#FEF2F2] border border-[#FCA5A5] rounded-[24px] p-6 flex gap-4 items-start relative shadow-sm text-sm"
            >
              <div className="bg-[#FEE2E2] p-2 rounded-xl text-[#EF4444] shrink-0">
                <AlertCircle size={20} />
              </div>
              <div className="flex-1">
                <h4 className="font-serif font-bold text-[#991B1B] text-base mb-1">Process Warning</h4>
                <p className="text-[#B91C1C] leading-relaxed font-sans mb-4">{error}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-[#EF4444] text-white hover:bg-[#DC2626] px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 text-xs cursor-pointer shadow-sm"
                  >
                    <RefreshCw size={14} />
                    Reload Portal
                  </button>
                  <a
                    href={window.location.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white text-[#EF4444] border border-[#FCA5A5] hover:bg-[#FEE2E2] px-4 py-2 rounded-xl font-semibold transition-colors flex items-center gap-2 text-xs inline-flex cursor-pointer shadow-sm"
                  >
                    <ExternalLink size={14} />
                    Open in New Tab
                  </a>
                </div>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-[#991B1B] hover:bg-[#FEE2E2] p-2 rounded-full transition-colors absolute top-4 right-4 cursor-pointer"
                aria-label="Close error"
              >
                <X size={16} />
              </button>
            </motion.div>)}

          {!resultText && !flashcards.length && !videoData && (
            <div className={`absolute inset-0 overflow-y-auto p-6 sm:p-8 lg:p-12 z-0 transition-colors custom-scrollbar ${
              isDarkMode ? "academic-workspace-dark text-[#E0E0D5]" : "academic-workspace-light text-slate-800"
            }`}>
              
              {/* ========================================================================= */}
              {/* CONDITIONAL VIEW: UNIVERSITY E-LIBRARY (ARCHITECTURAL ENVIRONMENT)       */}
              {/* ========================================================================= */}
              {inputType === "library" ? (
                <div className="relative min-h-full rounded-3xl overflow-hidden border border-amber-900/10 dark:border-amber-500/10 shadow-2xl bg-[#FDFBF7] dark:bg-[#0C101A]">
                  
                  {/* ========================================================================= */}
                  {/* REALISTIC MODERN UNIVERSITY LIBRARY & AI ENVIRONMENT (MULTI-LAYER DEPTH) */}
                  {/* ========================================================================= */}
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden -z-0">
                    
                    {/* --- DEPTH LAYER 1 (FAR BACKGROUND): ARCHITECTURAL WALLS, WINDOWS & DAYLIGHT --- */}
                    {/* Dark Navy Accent Wall + Cream/Ivory Header Wall */}
                    <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-[#0F172A] via-[#1E293B] to-transparent opacity-95 dark:opacity-98" />
                    
                    {/* Natural Daylight Arched Windows (Left & Right Background) */}
                    <div className="absolute top-4 left-10 hidden xl:flex gap-4 opacity-40 dark:opacity-20">
                      <div className="w-16 h-28 rounded-t-full border border-sky-200/60 bg-gradient-to-b from-sky-100/50 via-blue-50/20 to-transparent relative overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-200/40" />
                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-200/40" />
                      </div>
                      <div className="w-16 h-28 rounded-t-full border border-sky-200/60 bg-gradient-to-b from-sky-100/50 via-blue-50/20 to-transparent relative overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-200/40" />
                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-200/40" />
                      </div>
                    </div>

                    <div className="absolute top-4 right-10 hidden xl:flex gap-4 opacity-40 dark:opacity-20">
                      <div className="w-16 h-28 rounded-t-full border border-sky-200/60 bg-gradient-to-b from-sky-100/50 via-blue-50/20 to-transparent relative overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-200/40" />
                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-200/40" />
                      </div>
                      <div className="w-16 h-28 rounded-t-full border border-sky-200/60 bg-gradient-to-b from-sky-100/50 via-blue-50/20 to-transparent relative overflow-hidden">
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-sky-200/40" />
                        <div className="absolute inset-y-0 left-1/2 w-[1px] bg-sky-200/40" />
                      </div>
                    </div>

                    {/* Minimal Linear Pendant Ceiling Lighting */}
                    <div className="absolute top-0 left-1/4 w-[1px] h-10 bg-slate-400/40" />
                    <div className="absolute top-10 left-[calc(25%-18px)] w-9 h-1.5 rounded-full bg-amber-200/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
                    
                    <div className="absolute top-0 right-1/4 w-[1px] h-10 bg-slate-400/40" />
                    <div className="absolute top-10 right-[calc(25%-18px)] w-9 h-1.5 rounded-full bg-amber-200/90 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />

                    {/* Architectural Vertical Wood Slat Panels on Flanks */}
                    <div className="absolute top-0 bottom-0 left-0 w-10 sm:w-16 opacity-30 dark:opacity-15 bg-[repeating-linear-gradient(90deg,#78350F_0,#78350F_4px,transparent_4px,transparent_14px)]" />
                    <div className="absolute top-0 bottom-0 right-0 w-10 sm:w-16 opacity-30 dark:opacity-15 bg-[repeating-linear-gradient(90deg,#78350F_0,#78350F_4px,transparent_4px,transparent_14px)]" />

                    {/* WALL DESIGN: TASTEFUL ACADEMIC GRAPHICS & MINIMAL ICONS */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 text-center text-white select-none z-0">
                      <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-mono tracking-[0.35em] uppercase font-bold text-amber-100/70">
                        <BookOpen size={14} className="text-amber-300" />
                        <span>READ &bull; LEARN &bull; GROW</span>
                        <GraduationCap size={14} className="text-indigo-300" />
                      </div>
                      <div className="flex items-center justify-center gap-3 mt-1.5 text-[10px] sm:text-xs text-slate-300/60 font-serif italic tracking-wide">
                        <Lightbulb size={12} className="text-amber-400/70 inline" />
                        <span>Knowledge is the key to a brighter future &bull; Explore &bull; Discover &bull; Achieve</span>
                        <Workflow size={12} className="text-cyan-400/70 inline" />
                      </div>
                    </div>

                    {/* --- DEPTH LAYER 2 (MIDDLEGROUND): FLOOR-TO-CEILING BOOKSHELVES & WARM LEDS --- */}
                    <div className="absolute top-24 left-14 right-14 h-48 border-b-4 border-amber-900/30 hidden md:flex items-end justify-between px-6 opacity-35 dark:opacity-25">
                      
                      {/* Bookshelf Section A (Left) */}
                      <div className="flex items-end gap-1.5 pb-0.5">
                        <div className="w-3.5 h-28 bg-[#854D0E] rounded-t-xs shadow-inner flex flex-col justify-around py-1 px-0.5"><div className="h-0.5 bg-amber-300/40" /></div>
                        <div className="w-4 h-32 bg-[#1E3A8A] rounded-t-xs shadow-inner flex flex-col justify-around py-1 px-0.5"><div className="h-0.5 bg-amber-300/40" /></div>
                        <div className="w-3 h-24 bg-[#065F46] rounded-t-xs" />
                        <div className="w-4.5 h-30 bg-[#991B1B] rounded-t-xs" />
                        <div className="w-3 h-26 bg-[#4C1D95] rounded-t-xs" />
                        <div className="w-4 h-34 bg-[#78350F] rounded-t-xs" />
                      </div>

                      {/* Indoor Botanical Potted Plant (Monstera / Ficus Silhouette) */}
                      <div className="flex flex-col items-center pb-0.5">
                        <div className="flex items-center -space-x-1.5">
                          <div className="w-5 h-7 rounded-full bg-emerald-600/70 -rotate-25 transform origin-bottom" />
                          <div className="w-6 h-9 rounded-full bg-emerald-700/80 -rotate-5 transform origin-bottom" />
                          <div className="w-5 h-7 rounded-full bg-emerald-600/70 rotate-25 transform origin-bottom" />
                        </div>
                        <div className="w-7 h-6 rounded-b-md bg-amber-800/80 border-t-2 border-amber-900" />
                      </div>

                      {/* Bookshelf Section B (Center-Right) */}
                      <div className="flex items-end gap-1.5 pb-0.5">
                        <div className="w-4 h-32 bg-[#312E81] rounded-t-xs" />
                        <div className="w-3.5 h-28 bg-[#B45309] rounded-t-xs" />
                        <div className="w-3 h-22 bg-[#0F766E] rounded-t-xs" />
                        <div className="w-4.5 h-36 bg-[#831843] rounded-t-xs" />
                        <div className="w-3 h-26 bg-[#1F2937] rounded-t-xs" />
                      </div>

                      {/* Minimalist Study Desk & Chair Outline (Foreground Furniture) */}
                      <div className="hidden lg:flex flex-col items-end pb-0.5 opacity-60">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-5 rounded-t-md border border-amber-600 bg-amber-700/40" />
                          <div className="w-16 h-1.5 bg-amber-800 rounded-xs" />
                        </div>
                        <div className="flex justify-between w-16 px-1">
                          <div className="w-0.5 h-6 bg-slate-500" />
                          <div className="w-0.5 h-6 bg-slate-500" />
                        </div>
                      </div>
                    </div>

                    {/* Warm LED Shelf Lighting Horizon & Glow */}
                    <div className="absolute top-44 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-300/50 dark:via-amber-400/25 to-transparent blur-[2px]" />
                    <div className="absolute top-44 left-1/4 right-1/4 h-12 bg-gradient-to-b from-amber-300/15 via-amber-200/5 to-transparent blur-md pointer-events-none" />

                    {/* --- DEPTH LAYER 3: SUBTLE AI / DIGITAL NETWORK PARTICLES --- */}
                    <svg className="absolute inset-0 w-full h-full opacity-20 dark:opacity-15" xmlns="http://www.w3.org/2000/svg">
                      <line x1="15%" y1="20%" x2="28%" y2="35%" stroke="#6366F1" strokeWidth="0.75" strokeDasharray="3 3" />
                      <line x1="28%" y1="35%" x2="42%" y2="25%" stroke="#06B6D4" strokeWidth="0.75" strokeDasharray="3 3" />
                      <line x1="70%" y1="22%" x2="82%" y2="32%" stroke="#7C3AED" strokeWidth="0.75" strokeDasharray="3 3" />
                      <circle cx="15%" cy="20%" r="2" fill="#6366F1" />
                      <circle cx="28%" cy="35%" r="2.5" fill="#06B6D4" />
                      <circle cx="42%" cy="25%" r="2" fill="#818CF8" />
                      <circle cx="70%" cy="22%" r="2.5" fill="#A855F7" />
                      <circle cx="82%" cy="32%" r="2" fill="#06B6D4" />
                    </svg>

                    {/* Ambient Daylight & Soft Atmosphere Glow */}
                    <div className="absolute top-0 right-1/4 w-[450px] h-[350px] bg-gradient-to-b from-amber-100/30 via-sky-100/20 to-transparent dark:from-indigo-950/20 rounded-full blur-[90px]" />
                    <div className="absolute bottom-6 left-1/4 w-[450px] h-[350px] bg-gradient-to-t from-blue-100/25 via-indigo-100/15 to-transparent dark:from-blue-950/20 rounded-full blur-[100px]" />
                  </div>

                  {/* PART 17: UI CONTENT LAYER WITH HIGH READABILITY (Backdrop Blur & Overlay) */}
                  <div className="relative z-10 p-6 sm:p-10 backdrop-blur-[3px] bg-white/80 dark:bg-slate-900/85 min-h-full flex flex-col justify-between">
                    
                    {/* Library Header & Controls */}
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800">
                        <div>
                          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/50 border border-amber-200/80 dark:border-amber-800/50 text-[11px] font-semibold text-amber-800 dark:text-amber-300 mb-2">
                            <Library size={13} />
                            <span>University Academic E-Library</span>
                          </div>
                          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 dark:text-white">
                            Scholarly Curriculum Repository
                          </h2>
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Browse official course textbooks, syllabi compendiums, and accredited research volumes.
                          </p>
                        </div>

                        {/* Back to Welcome Hub Button */}
                        <button
                          onClick={() => setInputType("upload")}
                          className="self-start sm:self-center inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600 text-slate-700 dark:text-slate-200 text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                        >
                          <ArrowRight className="w-3.5 h-3.5 rotate-180" />
                          <span>Back to Learning Hub</span>
                        </button>
                      </div>

                      {/* Search & Department Filters Bar */}
                      <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1 max-w-md">
                          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            placeholder="Search by title, author, or subject..."
                            value={searchQuery ?? ""}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
                          />
                        </div>

                        {/* Department Filters */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                          {["All", "MCA", "BCA", "Engineering", "Pharmacy", "Commerce", "Science", "Arts"].map((dept) => {
                            const isActive = selectedDept === dept;
                            return (
                              <button
                                key={dept}
                                onClick={() => setSelectedDept(dept)}
                                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all shrink-0 cursor-pointer ${
                                  isActive
                                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm"
                                    : "bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750"
                                }`}
                              >
                                {dept}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Books Grid */}
                      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {allLibraryBooks.filter(bk => {
                          if (selectedDept !== "All" && bk.department !== selectedDept) return false;
                          if (searchQuery.trim()) {
                            const q = searchQuery.toLowerCase();
                            return bk.title.toLowerCase().includes(q) || bk.author.toLowerCase().includes(q) || (bk.desc && bk.desc.toLowerCase().includes(q));
                          }
                          return true;
                        }).map((bk) => {
                          const isSelected = fileData?.fileUri === bk.id || ((bk as any).fileUri && fileData?.fileUri === (bk as any).fileUri);
                          return (
                            <div
                              key={bk.id}
                              className={`p-5 rounded-2xl bg-white dark:bg-slate-800/90 border transition-all duration-200 flex flex-col justify-between text-left shadow-sm hover:shadow-md hover:-translate-y-1 ${
                                isSelected 
                                  ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20" 
                                  : "border-slate-200/90 dark:border-slate-700/80 hover:border-indigo-300 dark:hover:border-indigo-600"
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900">
                                    {bk.department}
                                  </span>
                                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                                <h4 className="font-serif font-bold text-sm sm:text-base text-slate-800 dark:text-slate-100 line-clamp-2">
                                  {bk.title}
                                </h4>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                  Author: {bk.author}
                                </p>
                                {bk.desc && (
                                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2.5 leading-relaxed line-clamp-3 italic">
                                    "{bk.desc}"
                                  </p>
                                )}
                              </div>

                              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                                <button
                                  onClick={() => {
                                    setFileData({ fileUri: (bk as any).fileUri || bk.id, mimeType: (bk as any).mimeType || "text/plain" });
                                    setFile(new File([], `[Library Book] ${bk.title}`));
                                    setResultText("");
                                    setResultType("");
                                    setInputType("upload");
                                  }}
                                  className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300"
                                  }`}
                                >
                                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  <span>{isSelected ? "Active Academic Source" : "Select & Synthesize"}</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bottom Library Environment Footer */}
                    <div className="mt-12 pt-6 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                      <span>Curated by University Academic Board</span>
                      <span>Open Educational Resources (OER) Standard</span>
                    </div>

                  </div>
                </div>
              ) : (
                <div className="relative min-h-[calc(100vh-6rem)] flex flex-col justify-between max-w-7xl mx-auto w-full select-text">
                  
                  {/* PART 12: SOPHISTICATED AMBIENT LIGHT BACKGROUND */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden select-none -z-10">
                    <div className="absolute -top-32 -left-32 w-[520px] h-[520px] bg-indigo-200/40 dark:bg-indigo-900/20 rounded-full blur-[130px]" />
                    <div className="absolute top-1/3 -right-24 w-[480px] h-[480px] bg-purple-200/35 dark:bg-purple-900/15 rounded-full blur-[130px]" />
                    <div className="absolute -bottom-32 left-1/4 w-[600px] h-[600px] bg-blue-100/50 dark:bg-blue-950/20 rounded-full blur-[140px]" />

                    {/* Subtle Mathematical Watermark Symbols */}
                    <span className="absolute top-16 left-[22%] text-xs font-mono text-indigo-500/20 dark:text-indigo-400/15 select-none hidden lg:block">
                      ∇ × E = -∂B/∂t
                    </span>
                    <span className="absolute bottom-28 right-[18%] text-xs font-mono text-purple-500/20 dark:text-purple-400/15 select-none hidden lg:block">
                      ∮ B · dl = μ₀I
                    </span>
                    <span className="absolute top-1/2 left-4 text-xs font-mono text-indigo-400/20 select-none hidden md:block">
                      ∑ 1/k² = π²/6
                    </span>
                  </div>

                  {/* ========================================================================= */}
                  {/* PART 4: TWO-COLUMN HERO SECTION (55% Left / 45% Right)                   */}
                  {/* ========================================================================= */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center pt-2 pb-10">
                    
                    {/* ----------------- LEFT COLUMN (55% on Desktop) ----------------- */}
                    <div className="lg:col-span-7 flex flex-col items-start text-left space-y-5">
                      
                      {/* PART 5: HERO BADGE */}
                      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EEF2FF] dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
                        <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
                        <span className="text-xs font-semibold tracking-wider uppercase text-[#4F46E5] dark:text-indigo-300">
                          ✦ YOUR AI LEARNING COMPANION
                        </span>
                      </div>

                      {/* PART 6: HERO HEADING */}
                      <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.12]">
                        <span className="block text-[#1E1B4B] dark:text-white">Welcome to</span>
                        <span className="bg-gradient-to-r from-[#4F46E5] via-[#6366F1] to-[#7C3AED] bg-clip-text text-transparent">
                          Notivexa AI
                        </span>
                      </h1>

                      {/* PART 7: DESCRIPTION */}
                      <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-[560px] leading-relaxed font-normal">
                        Your intelligent academic workspace for transforming textbooks, lectures, research papers and study material into interactive learning experiences.
                      </p>

                      {/* PART 8: CTA BUTTONS */}
                      <div className="flex flex-wrap items-center gap-4 pt-2">
                        {/* Start Learning Primary CTA */}
                        <button
                          onClick={() => {
                            if (fileData) {
                              generateNotes();
                            } else {
                              const fileInput = document.getElementById("file-upload") as HTMLInputElement;
                              if (fileInput) fileInput.click();
                            }
                          }}
                          className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] hover:from-[#4338CA] hover:to-[#6D28D9] text-white font-medium text-sm shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"
                        >
                          <Sparkles className="w-4 h-4 text-indigo-200 group-hover:rotate-12 transition-transform" />
                          <span>✦ Start Learning</span>
                        </button>

                        {/* Explore AI Tools Secondary CTA */}
                        <button
                          onClick={() => {
                            const el = document.getElementById("notivexa-feature-grid");
                            el?.scrollIntoView({ behavior: "smooth" });
                          }}
                          className="group inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-900/60 hover:border-purple-400 dark:hover:border-purple-600 text-[#7C3AED] dark:text-purple-300 font-medium text-sm shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
                        >
                          <span>Explore AI Tools</span>
                          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                      </div>

                      {/* Micro Quality Standards */}
                      <div className="pt-2 flex flex-wrap items-center gap-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Curriculum Compliant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Multi-Modal Synthesizer</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-purple-500" />
                          <span>LaTeX & Proof Enabled</span>
                        </div>
                      </div>
                    </div>

                    {/* ----------------- RIGHT COLUMN (45% on Desktop) ----------------- */}
                    {/* PART 9: LAYERED ACADEMIC AI VISUAL (Pure CSS / Shapes / Depth)    */}
                    <div className="lg:col-span-5 relative flex items-center justify-center min-h-[380px] select-none">
                      
                      {/* Orbital Rings & Ambient AI Aura */}
                      <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full border border-indigo-200/50 dark:border-indigo-900/30 animate-[spin_80s_linear_infinite]" />
                      <div className="absolute w-60 sm:w-80 h-60 sm:h-80 rounded-full border border-purple-200/40 dark:border-purple-900/25 border-dashed" />

                      {/* Main Tablet / Workspace Canvas Container */}
                      <div className="relative w-full max-w-[420px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-indigo-100/90 dark:border-slate-800 rounded-3xl p-6 shadow-2xl shadow-indigo-500/10 hover:shadow-indigo-500/20 transition-all duration-300 animate-float-gentle">
                        
                        {/* Tablet Header Bar */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#4F46E5] to-[#7C3AED] flex items-center justify-center shadow-md shadow-indigo-500/20">
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">Notivexa Synthesizer</div>
                              <div className="text-[10px] text-slate-400">Academic Core v2.4</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/40">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">READY</span>
                          </div>
                        </div>

                        {/* Interactive Feature Elements Inside Tablet Canvas */}
                        <div className="mt-4 space-y-3">
                          {/* Slide / Presentation Deck Simulation */}
                          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <Presentation className="w-4 h-4 text-[#4F46E5]" />
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Interactive Lecture Deck</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/60 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-medium">12 Slides</span>
                          </div>

                          {/* Handwritten Study Note Simulation */}
                          <div className="p-3 bg-purple-50/70 dark:bg-purple-950/40 rounded-xl border border-purple-100 dark:border-purple-900/40 flex items-center justify-between hover:bg-purple-50 dark:hover:bg-purple-950 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <FileText className="w-4 h-4 text-[#7C3AED]" />
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Handwritten Summary</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-200/60 dark:bg-purple-900 text-purple-700 dark:text-purple-300 font-medium">Bloom L5</span>
                          </div>

                          {/* Spaced Repetition Flashcards Simulation */}
                          <div className="p-3 bg-cyan-50/70 dark:bg-cyan-950/40 rounded-xl border border-cyan-100 dark:border-cyan-900/40 flex items-center justify-between hover:bg-cyan-50 dark:hover:bg-cyan-950 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <Layers className="w-4 h-4 text-[#06B6D4]" />
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Flashcards Practice Deck</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-200/60 dark:bg-cyan-900 text-cyan-700 dark:text-cyan-300 font-medium">Active</span>
                          </div>
                        </div>

                        {/* Floating Academic Badges */}
                        <div className="absolute -top-4 -right-4 bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 text-indigo-600 dark:text-indigo-400">
                          <GraduationCap className="w-6 h-6" />
                        </div>

                        <div className="absolute -bottom-4 -left-4 bg-white dark:bg-slate-800 p-2.5 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 text-amber-500">
                          <Lightbulb className="w-6 h-6" />
                        </div>
                      </div>

                    </div>

                  </div>

                  {/* ========================================================================= */}
                  {/* PART 10: 2 × 2 FEATURE TOOL GRID                                          */}
                  {/* ========================================================================= */}
                  <div id="notivexa-feature-grid" className="pt-8 pb-10">
                    <div className="mb-4 text-left">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Core Academic Modules &bull; Intelligent Synthesis
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      
                      {/* CARD 1: AI PowerPoint Studio */}
                      <div 
                        onClick={() => {
                          if (fileData) generatePPT();
                          else {
                            const fi = document.getElementById("file-upload") as HTMLInputElement;
                            if (fi) fi.click();
                          }
                        }}
                        className="group p-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-[#4F46E5] dark:text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <Presentation className="w-5 h-5" />
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">AI PowerPoint Studio</h4>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Turn your academic content into structured presentations.
                        </p>
                      </div>

                      {/* CARD 2: Handwritten Summaries */}
                      <div 
                        onClick={() => {
                          if (fileData) generateNotes();
                          else {
                            const fi = document.getElementById("file-upload") as HTMLInputElement;
                            if (fi) fi.click();
                          }
                        }}
                        className="group p-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-purple-400 dark:hover:border-purple-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-[#7C3AED] dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Handwritten Summaries</h4>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-purple-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Generate concise study notes with a handwritten learning style.
                        </p>
                      </div>

                      {/* CARD 3: Interactive Flashcards */}
                      <div 
                        onClick={() => {
                          if (fileData) generateFlashcards();
                          else {
                            const fi = document.getElementById("file-upload") as HTMLInputElement;
                            if (fi) fi.click();
                          }
                        }}
                        className="group p-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-cyan-400 dark:hover:border-cyan-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-[#06B6D4] dark:text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <Layers className="w-5 h-5" />
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Interactive Flashcards</h4>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-cyan-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Practice concepts with intelligent flashcards.
                        </p>
                      </div>

                      {/* CARD 4: Smart Video Theatre */}
                      <div 
                        onClick={() => {
                          if (fileData) generateVideoExplanation();
                          else {
                            const fi = document.getElementById("file-upload") as HTMLInputElement;
                            if (fi) fi.click();
                          }
                        }}
                        className="group p-5 bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-pink-400 dark:hover:border-pink-500 hover:-translate-y-1 transition-all duration-200 cursor-pointer text-left"
                      >
                        <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                          <Video className="w-5 h-5" />
                        </div>
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 text-sm">Smart Video Theatre</h4>
                          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-pink-600 group-hover:translate-x-1 transition-all" />
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          Learn complex topics through AI-powered video explanations.
                        </p>
                      </div>

                    </div>
                  </div>

                  {/* ========================================================================= */}
                  {/* PART 11: QUICK ACCESS BAR                                                */}
                  {/* ========================================================================= */}
                  <div className="pt-2 pb-6 border-t border-slate-200/60 dark:border-slate-800/80">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          QUICK ACCESS
                        </span>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Jump into your academic tools
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            if (fileData) generateExamPaper();
                            else {
                              const fi = document.getElementById("file-upload") as HTMLInputElement;
                              if (fi) fi.click();
                            }
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                          <GraduationCap className="w-4 h-4 text-indigo-600" />
                          <span>Exam Paper & Question Bank</span>
                        </button>

                        <button
                          onClick={() => {
                            setInputType("upload");
                            const fileInput = document.getElementById("file-upload") as HTMLInputElement;
                            if (fileInput) fileInput.click();
                          }}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                          <Upload className="w-4 h-4 text-purple-600" />
                          <span>Upload Syllabus / PDF</span>
                        </button>

                        <button
                          onClick={() => setInputType("library")}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs hover:shadow-sm transition-all cursor-pointer"
                        >
                          <Library className="w-4 h-4 text-cyan-600" />
                          <span>University E-Library</span>
                        </button>
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </div>
          )}



          {slides.length > 0 && (
            <div className="bg-white rounded-[24px] shadow-[0_4px_25px_rgba(15,23,42,0.06)] overflow-hidden relative border border-slate-200/80">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-rose-600 to-pink-600"></div>
              <div className="border-b border-[#E0E0D5] p-6 flex items-center justify-between">
                <h3 className="font-serif text-2xl text-[#3A3A2F]">
                  Presentation Generated
                </h3>
                <div className="flex gap-2">
                  <select 
                    value={pptTheme}
                    onChange={(e) => setPptTheme(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                  >
                    <option value="academic">Academic Theme</option>
                    <option value="professional">Professional Theme</option>
                    <option value="minimalist">Minimalist Theme</option>
                    <option value="pastel">Soft Pastel</option>
                  </select>
                  <button 
                    onClick={() => setShowPreviewModal(true)}
                    className="flex items-center gap-2 bg-pink-100 text-pink-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-pink-200 transition-colors"
                  >
                    <Presentation size={16} /> Preview Slides
                  </button>
                  <button 
                    onClick={downloadPPT}
                    className="flex items-center gap-2 bg-[#5A5A40] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-opacity-90 transition-colors"
                  >
                    <Download size={16} /> Download PPTX
                  </button>
                  <button 
                    onClick={() => {
                      setSlides([]);
                      setResultType("");
                    }} 
                    className="text-[#8A8A7A] hover:bg-[#F5F5F0] p-2 rounded-xl transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="p-8">
                <p className="text-gray-600 mb-6">Generated {slides.length} slides successfully. Click the download button above to get your presentation.</p>
                
                <div className="space-y-6">
                  {slides.slice(0, 5).map((slide, idx) => (
                    <div key={idx} className="border border-slate-200 rounded-xl p-6 bg-slate-50">
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Slide {idx + 1} • {slide.slideType}</div>
                      <h4 className="font-bold text-lg text-slate-800 mb-3">{slide.title}</h4>
                      <ul className="list-disc pl-5 space-y-1 text-slate-600">
                        {slide.bullets?.map((b, bIdx) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  {slides.length > 5 && (
                    <div className="text-center text-slate-500 italic p-4 border border-dashed border-slate-300 rounded-xl">
                      ...and {slides.length - 5} more slides. Download the PPTX to see them all.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          {resultText && (
            <div className="bg-white rounded-[24px] shadow-[0_4px_25px_rgba(15,23,42,0.06)] overflow-hidden relative border border-slate-200/80">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600"></div>
              <div className="border-b border-[#E0E0D5] p-6 flex items-center justify-between">
                <h3 className="font-serif text-2xl text-[#3A3A2F]">
                  {resultType === "lesson-plan" ? "Study Lesson Planner" : resultType === "question-bank" ? "Study Question Bank" : resultType === "assessment" ? "Assessment Paper" : "Chapter-wise Summary"}
                </h3>
                {true && (
                  <div className="flex flex-wrap items-center gap-2">
{ (
                      <>
                        <select
                          value={pageStyle ?? "ruled"}
                          onChange={(e) => setPageStyle(e.target.value)}
                          className="border border-[#5A5A40] text-[#5A5A40] bg-transparent hover:bg-[#FAF9F6] py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-widest outline-none cursor-pointer transition-colors"
                        >
                          <option value="plain">Plain Page</option>
                          <option value="ruled">Ruled Page</option>
                          <option value="box">Box Page</option>
                        </select>
                        <select
                          value={penColor ?? "blue"}
                          onChange={(e) => setPenColor(e.target.value)}
                          className="border border-[#5A5A40] text-[#5A5A40] bg-transparent hover:bg-[#FAF9F6] py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-widest outline-none cursor-pointer transition-colors"
                        >
                          <option value="black">Black Pen</option>
                          <option value="blue">Blue Pen</option>
                        </select>
                        <select
                          value={handwritingFont ?? "font-handwriting"}
                          onChange={(e) => setHandwritingFont(e.target.value)}
                          className="border border-[#5A5A40] text-[#5A5A40] bg-transparent hover:bg-[#FAF9F6] py-2 px-3 rounded-full text-xs font-semibold uppercase tracking-widest outline-none cursor-pointer transition-colors"
                        >
                          <option value="font-handwriting">Caveat</option>
                          <option value="font-handwriting-indie">Indie Flower</option>
                          <option value="font-handwriting-kalam">Kalam</option>
                          <option value="font-handwriting-shadows">Shadows</option>
                          <option value="font-handwriting-patrick">Patrick</option>
                        </select>
                      </>)}
                    <div className="flex items-center gap-2">
                      {resultText && (
                        <div className="flex items-center gap-1 bg-white/50 border border-[#D1D1C4] rounded-full p-1 shadow-sm mr-2">
                          <button
                            onClick={handlePlayPauseSpeech}
                            className={`p-1.5 rounded-full transition-colors ${isSpeaking && !isSpeechPaused ? 'bg-[#5A5A40] text-white' : 'text-[#5A5A40] hover:bg-[#F0F0E8]'}`}
                            title={isSpeaking && !isSpeechPaused ? "Pause Audio" : "Play Audio"}
                          >
                            {isSpeaking && !isSpeechPaused ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill={isSpeaking && isSpeechPaused ? "currentColor" : "none"} />}
                          </button>
                          {(isSpeaking || isSpeechPaused) && (
                            <button
                              onClick={handleStopSpeech}
                              className="p-1.5 rounded-full transition-colors text-red-500 hover:bg-red-50"
                              title="Stop Audio"
                            >
                              <Square size={14} fill="currentColor" />
                            </button>
                          )}
                        </div>
                      )}
                    <div className="relative">
                      <button
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={isExporting}
                        className="border border-[#5A5A40] bg-[#5A5A40] text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed py-2 px-4 rounded-full text-xs font-semibold uppercase tracking-widest transition-colors flex items-center gap-2"
                      >
                        {isExporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} 
                        {isExporting ? 'Exporting...' : 'Export'}
                        <ChevronDown size={14} />
                      </button>
                      {showExportMenu && (
                        <div className={`absolute right-0 mt-2 w-48 rounded-lg shadow-xl border z-50 overflow-hidden ${isDarkMode ? "bg-[#282824] border-[#383832]" : "bg-white border-slate-200"}`}>
                          <button onClick={() => { setShowExportMenu(false); downloadHandwrittenPDF(false); }} className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${isDarkMode ? "hover:bg-[#383832] text-[#E0E0D5]" : "hover:bg-slate-50 text-slate-700"} flex items-center gap-2`}>
                            <FileText size={14} /> High-Quality PDF
                          </button>
                          <button onClick={() => { setShowExportMenu(false); downloadHandwrittenPDF(true); }} className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider transition-colors ${isDarkMode ? "hover:bg-[#383832] text-[#E0E0D5]" : "hover:bg-slate-50 text-slate-700"} flex items-center gap-2`}>
                            <FileText size={14} /> Fast Export PDF
                          </button>
                          <button onClick={downloadDoc} className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider border-t transition-colors ${isDarkMode ? "border-[#383832] hover:bg-[#383832] text-[#E0E0D5]" : "border-slate-100 hover:bg-slate-50 text-slate-700"} flex items-center gap-2`}>
                            <FileText size={14} /> Word (DOC)
                          </button>
                          <button onClick={downloadMarkdown} className={`w-full text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider border-t transition-colors ${isDarkMode ? "border-[#383832] hover:bg-[#383832] text-[#E0E0D5]" : "border-slate-100 hover:bg-slate-50 text-slate-700"} flex items-center gap-2`}>
                            <FileText size={14} /> Markdown
                          </button>
                        </div>)}
                    </div>
                    </div>
                  </div>)}

              </div>
              
              <div className="p-8">
                {/* 
                  Applying a handwriting font class when in student mode.
                */}
                {resultType === "exam-paper" && examPaperType === "paper-university" && (
                  (() => {
                    try {
                      let cleanedText = resultText.trim();
                      if (cleanedText.startsWith("```json")) {
                        cleanedText = cleanedText.replace(/^```json/, "").replace(/```$/, "").trim();
                      }
                      const parsedData = JSON.parse(cleanedText);
                      return <UniversityPaperEditor initialData={parsedData} />;
                    } catch (e) {
                      console.error("Failed to parse paper-university JSON:", e);
                      return <div className="p-10 text-red-500 overflow-auto max-h-[80vh]">Error parsing generated paper format. Raw output: <pre className="mt-2 text-xs">{resultText}</pre></div>;
                    }
                  })()
                )}
                    <div 
                      ref={notesRef}
                  className={`prose max-w-none page-break-before exam-paper-table mx-auto ${resultType === 'exam-paper' && examPaperType === 'paper-university' ? 'hidden' : ''} bg-white shadow-xl ${(mode === 'student' && resultType !== 'exam-paper') ? `${handwritingFont} text-xl p-10 pb-16 rounded-sm relative` : 'font-sans text-[#4A4A3F] p-10 relative'}`}
                  style={Object.assign({
                    width: '210mm',
                    minHeight: '297mm',
                    boxSizing: 'border-box'
                  }, (mode === 'student' && resultType !== 'exam-paper') ? {
                    backgroundImage: pageStyle === 'ruled' 
                      ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
                      : pageStyle === 'box' 
                        ? 'repeating-linear-gradient(transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px), repeating-linear-gradient(90deg, transparent, transparent 31px, #e2e8f0 31px, #e2e8f0 32px)' 
                        : 'none',
                    backgroundAttachment: 'local',
                    lineHeight: '32px',
                    '--tw-prose-body': penColor === 'blue' ? '#1d4ed8' : '#3A3A2F',
                    '--tw-prose-headings': '#3A3A2F',
                    '--tw-prose-bold': '#3A3A2F',
                    '--tw-prose-th-borders': penColor === 'blue' ? 'rgba(29, 78, 216, 0.3)' : 'rgba(58, 58, 47, 0.3)',
                    '--tw-prose-td-borders': penColor === 'blue' ? 'rgba(29, 78, 216, 0.2)' : 'rgba(58, 58, 47, 0.2)',
                    color: penColor === 'blue' ? '#1d4ed8' : '#3A3A2F',
                  } as React.CSSProperties : {})}
                >
                  {(mode === 'student' && resultType !== 'exam-paper') && (
                    <>
                      {pageStyle !== 'box' && <div className="absolute left-10 top-0 bottom-0 w-px bg-[#fee2e2]"></div>}
                      <div className="absolute bottom-8 right-10 flex gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#bfdbfe]"></div>
                        <div className="w-2 h-2 rounded-full bg-[#dbeafe]"></div>
                      </div>
                    </>)}
                  <div className={(mode === 'student' && resultType !== 'exam-paper') ? "pl-8" : ""}>
                      { resultText.split('---SET_SEPARATOR---').map((setMarkdown, index) => (
                        <div key={`set-${index}`} className="mb-10">
                          {setMarkdown.split(/[\s\-_*"'`]*PAGE_BREAK[\s\-_*"'`]*/i).map((pageMarkdown, pageIndex, pageArr) => (
                            <div key={`page-${pageIndex}`} className="relative">

                              <div className="markdown-content">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm, remarkBreaks]}
                            components={{
                              table: ({node, ...props}) => <div className="overflow-x-auto my-4 w-full"><table className={`w-full border-collapse ${(mode === 'student' && resultType !== 'exam-paper') ? `border-2 border-opacity-20 ${penColor === 'blue' ? 'border-[#1d4ed8]' : 'border-[#3A3A2F]'}` : 'border border-black'}`} {...props} /></div>,
                              th: ({node, ...props}) => <th className={`p-2 text-left ${(mode === 'student' && resultType !== 'exam-paper') ? `border-b-2 border-opacity-20 bg-transparent font-bold text-inherit ${handwritingFont} ${penColor === 'blue' ? 'border-[#1d4ed8]' : 'border-[#3A3A2F]'}` : 'border border-black bg-gray-200'}`} {...props} />,
                              td: ({node, ...props}) => <td className={`p-2 ${(mode === 'student' && resultType !== 'exam-paper') ? `border-b border-opacity-20 text-inherit ${handwritingFont} ${penColor === 'blue' ? 'border-[#1d4ed8]' : 'border-[#3A3A2F]'}` : 'border border-black'}`} {...props} />,
                              li: ({node, ...props}) => <li className={`mb-2 ${(mode === 'student' && resultType !== 'exam-paper') ? `text-inherit ${handwritingFont}` : 'text-blue-600'}`} {...props} />,
                              h1: ({ children }) => <h1 className={`text-4xl md:text-5xl mt-10 mb-6 font-extrabold !text-black leading-tight tracking-tight`}>{children}</h1>,
                              h2: ({ children }) => <h2 className={`text-3xl md:text-4xl mt-8 mb-5 font-bold !text-black leading-snug tracking-tight`}>{children}</h2>,
                              h3: ({ children }) => <h3 className={`text-2xl mt-6 mb-4 font-bold !text-black`}>{children}</h3>,
                              h4: ({ children }) => <h4 className={`font-bold !text-black`}>{children}</h4>,
                              h5: ({ children }) => <h5 className={`font-bold !text-black`}>{children}</h5>,
                              h6: ({ children }) => <h6 className={`font-bold !text-black`}>{children}</h6>,
                              strong: ({ children }) => <strong className={(mode === 'student' && resultType !== 'exam-paper') ? 'font-bold text-inherit' : 'font-bold !text-black'}>{children}</strong>,
                              em: ({ children }) => <em className={(mode === 'student' && resultType !== 'exam-paper') ? 'text-inherit' : 'text-blue-600'}>{children}</em>,
                              pre({ node, children, ...props }: any) {
                                return <pre {...props} className={`${props.className || ''} ${(mode === 'student' && resultType !== 'exam-paper') ? 'bg-[#F9F9F7] border border-[#E0E0D5] rounded p-4' : 'bg-gray-100 p-2'}`}>{children}</pre>;
                              },
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                if (!inline && match && match[1] === 'mermaid') {
                                  const chartText = String(children).replace(/\n$/, '');
                                  const isMermaid = /^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|gitGraph|journey|quadrantChart|xychart|requirement|C4|mindmap|timeline|block|packet|architecture|kanban|sankey)/i.test(chartText);
                                  if (isMermaid) {
                                    return <MermaidChart chart={chartText} handwritingFont={handwritingFont} mode={mode} penColor={penColor} />;
                                  }

                                }

                                return (
                                  <code className={`${className} ${(mode === 'student' && resultType !== 'exam-paper') && !inline ? `${handwritingFont} text-lg` : ''}`} {...props}>
                                    {children}
                                  </code>);
                              },
                              p: ({node, children, ...props}: any) => {
                                const isStudent = mode === 'student' && resultType !== 'exam-paper';
                                const pClass = `mb-4 ${isStudent ? `text-inherit ${handwritingFont}` : 'text-blue-600'}`;
                                const content = String(children);
                                if (content.includes("[DIAGRAM:")) {
                                  const match = content.match(/\[DIAGRAM:(.*?)\]/);
                                  const label = match ? match[1].trim() : "Diagram Placeholder";
                                  return (
                                    <div className="my-10 border border-[#D1D1C4] rounded-2xl p-10 flex flex-col items-center justify-center bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.05)] min-h-[250px] relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-full h-1 bg-[#5A5A40] opacity-20"></div>
                                      <span className="bg-[#FAF9F6] text-[#8A8A7A] px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] mb-4 border border-[#E0E0D5]">Missing Diagram</span>
                                      <span className="text-[#3A3A2F] font-serif text-xl text-center max-w-md leading-snug">{label}</span>
                                      <p className="text-[#A1A194] font-sans text-xs mt-4 text-center">Gemini could not automatically extract this diagram as Mermaid code.</p>
                                    </div>);
                                }

                                if (/^Q\d+\.\s+/.test(content) && content.includes("Correct Answer:")) {
                                  const parts = content.split(/(A\)\s+|B\)\s+|C\)\s+|D\)\s+|Correct Answer:)/);
                                  return (
                                    <p className="whitespace-pre-wrap">
                                      {parts.map((part, i) => {
                                        if (part.startsWith('A)') || part.startsWith('B)') || part.startsWith('C)') || part.startsWith('D)')) {
                                          return <span key={i} className="block">{part}</span>;
                                        }

                                        if (part.startsWith('Correct Answer:')) {
                                          return <strong key={i} className="block text-black mt-2">{part}</strong>;
                                        }

                                        return <strong key={i} className="block text-black font-bold">{part}</strong>;
                                      })}
                                    </p>);
                                }

                                if (typeof children === 'string' && children.includes('?')) {
                                  return <p className="font-bold text-black">{children}</p>;
                                }

                                return <p className={pClass} {...props}>{children}</p>;
                              }

                            }
}
                          >
                            {pageMarkdown}
                          </ReactMarkdown>
                        </div>
                      </div>))}
                        </div>))}
                  </div>

                </div>
              </div>
            </div>)}
          {flashcards.length > 0 && (() => {
                let cardThemes = [];
                if (flashcardThemeStyle === "monochrome") {
                  cardThemes = [
                    {
                      front: "bg-gradient-to-br from-neutral-800 to-neutral-950 border-neutral-700",
                      back: "bg-gradient-to-bl from-neutral-700 to-neutral-900 border-neutral-600",
                      tag: "text-neutral-200 bg-white/10 border-white/20 backdrop-blur-sm",
                      accent: "from-white/5",
                      text: "text-neutral-50",
                      textSecondary: "text-neutral-400",
                      divider: "bg-neutral-600"
                    }

                  ];
                }
 else if (flashcardThemeStyle === "pastel") {
                  cardThemes = [
                    {
                      front: "bg-gradient-to-br from-rose-100 to-pink-50 border-rose-200",
                      back: "bg-gradient-to-bl from-pink-50 to-rose-100 border-pink-200",
                      tag: "text-rose-700 bg-black/5 border-black/10 backdrop-blur-sm",
                      accent: "from-white/40",
                      text: "text-rose-900",
                      textSecondary: "text-rose-600",
                      divider: "bg-rose-300"
                    },
                    {
                      front: "bg-gradient-to-br from-sky-100 to-blue-50 border-sky-200",
                      back: "bg-gradient-to-bl from-blue-50 to-sky-100 border-blue-200",
                      tag: "text-sky-700 bg-black/5 border-black/10 backdrop-blur-sm",
                      accent: "from-white/40",
                      text: "text-sky-900",
                      textSecondary: "text-sky-600",
                      divider: "bg-sky-300"
                    },
                    {
                      front: "bg-gradient-to-br from-emerald-100 to-green-50 border-emerald-200",
                      back: "bg-gradient-to-bl from-green-50 to-emerald-100 border-green-200",
                      tag: "text-emerald-700 bg-black/5 border-black/10 backdrop-blur-sm",
                      accent: "from-white/40",
                      text: "text-emerald-900",
                      textSecondary: "text-emerald-600",
                      divider: "bg-emerald-300"
                    },
                    {
                      front: "bg-gradient-to-br from-amber-100 to-yellow-50 border-amber-200",
                      back: "bg-gradient-to-bl from-yellow-50 to-amber-100 border-yellow-200",
                      tag: "text-amber-700 bg-black/5 border-black/10 backdrop-blur-sm",
                      accent: "from-white/40",
                      text: "text-amber-900",
                      textSecondary: "text-amber-600",
                      divider: "bg-amber-300"
                    }

                  ];
                }
 else if (flashcardThemeStyle === "high-contrast") {
                  cardThemes = [
                    {
                      front: "bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-yellow-400",
                      back: "bg-gradient-to-bl from-[#1a1a1a] to-[#000000] border-yellow-500",
                      tag: "text-[#000000] bg-yellow-400 border-yellow-300 backdrop-blur-sm",
                      accent: "from-yellow-400/20",
                      text: "text-yellow-400",
                      textSecondary: "text-yellow-200",
                      divider: "bg-yellow-400"
                    },
                    {
                      front: "bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-cyan-400",
                      back: "bg-gradient-to-bl from-[#1a1a1a] to-[#000000] border-cyan-500",
                      tag: "text-[#000000] bg-cyan-400 border-cyan-300 backdrop-blur-sm",
                      accent: "from-cyan-400/20",
                      text: "text-cyan-400",
                      textSecondary: "text-cyan-200",
                      divider: "bg-cyan-400"
                    },
                    {
                      front: "bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-fuchsia-400",
                      back: "bg-gradient-to-bl from-[#1a1a1a] to-[#000000] border-fuchsia-500",
                      tag: "text-[#000000] bg-fuchsia-400 border-fuchsia-300 backdrop-blur-sm",
                      accent: "from-fuchsia-400/20",
                      text: "text-fuchsia-400",
                      textSecondary: "text-fuchsia-200",
                      divider: "bg-fuchsia-400"
                    },
                    {
                      front: "bg-gradient-to-br from-[#000000] to-[#1a1a1a] border-green-400",
                      back: "bg-gradient-to-bl from-[#1a1a1a] to-[#000000] border-green-500",
                      tag: "text-[#000000] bg-green-400 border-green-300 backdrop-blur-sm",
                      accent: "from-green-400/20",
                      text: "text-green-400",
                      textSecondary: "text-green-200",
                      divider: "bg-green-400"
                    }

                  ];
                }
 else {
                  cardThemes = [
                    {
                      front: "bg-gradient-to-br from-[#5A5A40] to-[#42422F] border-[#6A6A4D]",
                      back: "bg-gradient-to-bl from-[#4A4A35] to-[#363627] border-[#5A5A40]",
                      tag: "text-[#F5F5F0] bg-white/10 border-white/20 backdrop-blur-sm",
                      accent: "from-white/10",
                      text: "text-[#F5F5F0]",
                      textSecondary: "text-[#E0E0D5]",
                      divider: "bg-white/20"
                    },
                    {
                      front: "bg-gradient-to-br from-[#8C4A42] to-[#6A3630] border-[#A35950]",
                      back: "bg-gradient-to-bl from-[#7A403A] to-[#5C2E29] border-[#8C4A42]",
                      tag: "text-[#FDF3F2] bg-white/10 border-white/20 backdrop-blur-sm",
                      accent: "from-white/10",
                      text: "text-[#FDF3F2]",
                      textSecondary: "text-[#EBD6D3]",
                      divider: "bg-white/20"
                    },
                    {
                      front: "bg-gradient-to-br from-[#967035] to-[#755524] border-[#B08544]",
                      back: "bg-gradient-to-bl from-[#85622C] to-[#66491D] border-[#967035]",
                      tag: "text-[#FDF8F0] bg-white/10 border-white/20 backdrop-blur-sm",
                      accent: "from-white/10",
                      text: "text-[#FDF8F0]",
                      textSecondary: "text-[#EBE0C8]",
                      divider: "bg-white/20"
                    },
                    {
                      front: "bg-gradient-to-br from-[#3D5266] to-[#2B3C4D] border-[#4F677D]",
                      back: "bg-gradient-to-bl from-[#34485C] to-[#243342] border-[#3D5266]",
                      tag: "text-[#F0F2F5] bg-white/10 border-white/20 backdrop-blur-sm",
                      accent: "from-white/10",
                      text: "text-[#F0F2F5]",
                      textSecondary: "text-[#D1D6DF]",
                      divider: "bg-white/20"
                    }

                  ];
                }

                const theme = cardThemes[currentCardIndex % cardThemes.length];

                return (
                  <div className="space-y-6">
                    <div className={`flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-6 rounded-[24px] shadow-[0_4px_20px_rgba(90,90,64,0.05)] border transition-colors ${isDarkMode ? "bg-[#22221F] border-[#383832]" : "bg-white border-[#E0E0D5]"}`}>
                      <div>
                        <h3 className={`font-serif text-2xl ${isDarkMode ? "text-[#F5F5F0]" : "text-[#3A3A2F]"}`}>Concept Flashcards</h3>
                        <p className={`text-sm mt-1 ${isDarkMode ? "text-[#A1A194]" : "text-[#8A8A7A]"}`}>Review key terminology and concepts</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <select
                          value={flashcardThemeStyle}
                          onChange={(e) => setFlashcardThemeStyle(e.target.value as any)}
                          className={`text-xs font-semibold py-2 px-3 rounded-full outline-none transition-colors ${isDarkMode ? "bg-[#282824] text-[#C2C2B0] border border-[#383832]" : "bg-[#F0F0E8] text-[#5A5A40] border border-[#E0E0D5]"}`}
                        >
                          <option value="default">Default Theme</option>
                          <option value="pastel">Soft Pastel</option>
                          <option value="monochrome">Monochrome</option>
                          <option value="high-contrast">High Contrast</option>
                        </select>
                        <div className={`text-xs font-semibold py-2 px-4 rounded-full ${isDarkMode ? "bg-[#282824] text-[#C2C2B0]" : "bg-[#F0F0E8] text-[#5A5A40]"}`}>
                          Progress: {currentCardIndex + 1} / {flashcards.length}
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDarkMode ? "bg-[#383832]" : "bg-[#E0E0D5]"}`}>
                      <div 
                        className="bg-[#5A5A40] h-full transition-all duration-300"
                        style={{ width: `${((currentCardIndex + 1) / flashcards.length) * 100}%` }}
                      />
                    </div>

                    {/* Interactive Flashcard with Flip Animation */}
                    <div 
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="group cursor-pointer perspective-1000 w-full max-w-2xl mx-auto h-96 relative focus:outline-none"
                    >
                      <div className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${isFlipped ? 'rotate-y-180' : ''}`}>
                        
                        {/* Front Side */}
                        <div className={`absolute inset-0 backface-hidden border rounded-[24px] shadow-xl p-12 flex flex-col items-center justify-center text-center transition-all ${theme.front} ${isDarkMode ? "shadow-black/40" : "shadow-[0_12px_40px_rgba(90,90,64,0.15)]"}`}>
                          <div className="absolute inset-0 rounded-[24px] border border-white/20 pointer-events-none mix-blend-overlay"></div>
                          <div className={`absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm ${theme.tag}`}>
                            Term / Concept
                          </div>
                          
                          {/* Decorative element */}
                          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${theme.accent} to-transparent rounded-tr-[24px] pointer-events-none`}></div>

                          <span className={`text-3xl md:text-5xl font-serif font-bold leading-tight px-4 select-none drop-shadow-md ${theme.text}`}>
                            {flashcards[currentCardIndex].term}
                          </span>
                          <div className="absolute bottom-8 flex flex-col items-center">
                            <div className={`w-8 h-1 rounded-full mb-3 ${theme.divider}`}></div>
                            <span className={`text-xs font-medium tracking-wide opacity-80 group-hover:opacity-100 transition-opacity ${theme.textSecondary}`}>
                              Click card to reveal definition
                            </span>
                          </div>
                        </div>

                        {/* Back Side */}
                        <div className={`absolute inset-0 backface-hidden border rounded-[24px] shadow-xl p-10 flex flex-col items-center justify-center text-center rotate-y-180 transition-all ${theme.back} ${isDarkMode ? "shadow-black/40" : "shadow-[0_12px_40px_rgba(90,90,64,0.15)]"}`}>
                          <div className="absolute inset-0 rounded-[24px] border border-white/20 pointer-events-none mix-blend-overlay"></div>
                          <div className={`absolute top-6 left-6 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full border shadow-sm ${theme.tag}`}>
                            Definition / Explanation
                          </div>

                          {/* Decorative element */}
                          <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${theme.accent} to-transparent rounded-tr-[24px] pointer-events-none`}></div>

                          <div className="flex-1 flex items-center justify-center w-full overflow-y-auto no-scrollbar py-6">
                            <p className={`text-lg md:text-xl font-medium leading-relaxed max-w-xl px-4 select-none ${theme.text}`}>
                              {flashcards[currentCardIndex].definition}
                            </p>
                          </div>
                          
                          <div className="absolute bottom-8 flex flex-col items-center">
                            <div className={`w-8 h-1 rounded-full mb-3 ${theme.divider}`}></div>
                            <span className={`text-xs font-medium tracking-wide opacity-80 group-hover:opacity-100 transition-opacity ${theme.textSecondary}`}>
                              Click card to show term
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between max-w-2xl mx-auto pt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                          setTimeout(() => {
                            setCurrentCardIndex(prev => Math.max(0, prev - 1));
                          }, isFlipped ? 150 : 0);
                        }
}
                        disabled={currentCardIndex === 0}
                        className="px-6 py-2.5 rounded-full border border-[#D1D1C4] text-[#5A5A40] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        &larr; Previous
                      </button>
                      <div className="flex flex-col items-center gap-2">
                        <div className="text-xs text-[#8A8A7A] font-bold uppercase tracking-[0.1em] select-none">
                          Card {currentCardIndex + 1} of {flashcards.length}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsFlipped(false);
                              setTimeout(() => {
                                setFlashcards(prev => {
                                  const shuffled = [...prev];
                                  for (let i = shuffled.length - 1; i > 0; i--) {
                                    const j = Math.floor(Math.random() * (i + 1));
                                    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
                                  }

                                  return shuffled;
                                });
                                setCurrentCardIndex(0);
                              }, isFlipped ? 150 : 0);
                            }
}
                            className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5 hover:text-[#3A3A2F] hover:bg-[#F0F0E8] px-3 py-1.5 rounded-full transition-colors"
                            title="Shuffle cards"
                          >
                            <Shuffle size={14} />
                            <span>Shuffle</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              downloadCSV();
                            }
}
                            className="text-xs font-semibold text-[#5A5A40] flex items-center gap-1.5 hover:text-[#3A3A2F] hover:bg-[#F0F0E8] px-3 py-1.5 rounded-full transition-colors"
                            title="Download as CSV for Anki/Quizlet"
                          >
                            <Download size={14} />
                            <span>CSV</span>
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsFlipped(false);
                          setTimeout(() => {
                            setCurrentCardIndex(prev => Math.min(flashcards.length - 1, prev + 1));
                          }, isFlipped ? 150 : 0);
                        }
}
                        disabled={currentCardIndex === flashcards.length - 1}
                        className="px-6 py-2.5 rounded-full bg-[#5A5A40] text-white hover:bg-opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold transition-colors flex items-center gap-2"
                      >
                        Next &rarr;
                      </button>
                    </div>
                  </div>);
              })()}
          {resultType === "video" && videoData && (
            <VideoExplainer 
              videoData={videoData} 
              onClose={() => {
                setVideoData(null);
                setResultType("");
              }
}
            />)}
      {/* Live Page Scanner Modal Overlay */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 bg-[#3A3A2F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[28px] shadow-2xl border border-[#E0E0D5] w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-[#E0E0D5] flex items-center justify-between bg-[#FAF9F6]">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#3A3A2F]">Live Book & Document Scanner</h3>
                <p className="text-xs text-[#8A8A7A]">Align your textbook page or handwritten notes to capture a clear summary</p>
              </div>
              <button
                onClick={() => {
                  stopCamera();
                  setIsScannerOpen(false);
                }
}
                className="p-2 hover:bg-[#E8E8E0] text-[#8A8A7A] hover:text-[#5A5A40] rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 bg-[#FAF9F6] flex flex-col items-center justify-center min-h-[300px] relative">
              {cameraError && (
                <div className="text-center p-6 bg-red-50 border border-red-200 rounded-2xl max-w-md">
                  <p className="text-sm font-bold text-red-800">Camera Error</p>
                  <p className="text-xs text-red-600 mt-2">{cameraError}</p>
                  <button
                    onClick={startCamera}
                    className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-bold rounded-full transition-colors"
                  >
                    Try Again
                  </button>
                </div>)}

              {isCameraLoading && (
                <div className="flex flex-col items-center justify-center space-y-3">
                  <Loader2 className="animate-spin text-[#5A5A40]" size={32} />
                  <p className="text-xs text-[#8A8A7A]">Starting camera feed...</p>
                </div>)}

              {/* Live Feed Container */}
              {!cameraError && !capturedPhoto && !isCameraLoading && (
                <div className="relative w-full aspect-video max-w-lg bg-black rounded-2xl overflow-hidden shadow-inner border border-[#E0E0D5]">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay Guides */}
                  <div className="absolute inset-4 border border-dashed border-white/60 pointer-events-none rounded-xl flex items-center justify-center">
                    <div className="text-[10px] bg-black/40 text-white/90 px-3 py-1 rounded-full uppercase tracking-widest font-mono">
                      Align Textbook Page Here
                    </div>
                  </div>
                </div>)}

              {/* Captured Photo Review */}
              {capturedPhoto && (
                <div className="relative w-full aspect-video max-w-lg bg-black rounded-2xl overflow-hidden shadow-md border border-[#E0E0D5]">
                  <img
                    src={capturedPhoto}
                    alt="Captured textbook page"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-[#5A5A40]/90 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                    Snapshot Review
                  </div>
                </div>)}
            </div>

            {/* Footer Controls */}
            <div className="p-6 border-t border-[#E0E0D5] flex justify-between items-center bg-white">
              {!capturedPhoto ? (
                <>
                  <button
                    onClick={() => {
                      stopCamera();
                      setIsScannerOpen(false);
                    }
}
                    className="px-5 py-2.5 rounded-full border border-[#D1D1C4] text-[#8A8A7A] hover:text-[#5A5A40] text-xs font-bold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={capturePhoto}
                    disabled={isCameraLoading || !cameraStream}
                    className="px-6 py-2.5 rounded-full bg-[#5A5A40] text-white hover:bg-opacity-90 disabled:opacity-50 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                  >
                    <Camera size={14} /> Capture Page
                  </button>
                </>) : (
                <>
                  <button
                    onClick={startCamera}
                    className="px-5 py-2.5 rounded-full border border-[#D1D1C4] text-[#8A8A7A] hover:text-[#5A5A40] text-xs font-bold transition-colors"
                  >
                    Retake Photo
                  </button>
                  <button
                    onClick={confirmScan}
                    className="px-6 py-2.5 rounded-full bg-[#5A5A40] text-white hover:bg-opacity-90 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
                  >
                    Confirm & Process Scan
                  </button>
                </>)}
            </div>
          </motion.div>
        </div>)}

      {/* PDF Export Progress Overlay Modal */}
      {isExporting && (
        <div className="fixed inset-0 z-50 bg-[#3A3A2F]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-2xl border border-[#E0E0D5] p-8 max-w-sm w-full text-center space-y-4"
          >
            <div className="flex justify-center">
              <div className="relative w-16 h-16 flex items-center justify-center bg-[#F5F5F0] rounded-full">
                <Loader2 className="animate-spin text-[#5A5A40]" size={32} />
                <FileText className="text-[#8A8A7A] absolute" size={16} />
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#3A3A2F]">Generating Your PDF</h3>
              <p className="text-xs text-[#8A8A7A]">Please wait while we compile and style your handwritten study notes.</p>
            </div>

            {/* Custom styled progress bar */}
            <div className="w-full bg-[#F5F5F0] h-2.5 rounded-full overflow-hidden">
              <motion.div 
                className="bg-[#5A5A40] h-full rounded-full"
                animate={{ width: `${exportProgress}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
            
            <div className="flex justify-between items-center text-[10px] font-mono text-[#8A8A7A] px-1">
              <span className="uppercase tracking-wider">Status</span>
              <span>{exportProgress}%</span>
            </div>
            
            <p className="text-[10px] font-medium text-[#6A6A5A] italic bg-[#FAF9F6] p-2.5 rounded-lg border border-[#E0E0D5]/60 min-h-[44px] flex items-center justify-center">
              {exportStatus}
            </p>
          </motion.div>
        </div>
      )}
      </div>
      </div>
    
      {showPreviewModal && (
        <SlidePreviewModal 
          slides={slides} 
          theme={pptTheme}
          onClose={() => setShowPreviewModal(false)} 
        />
      )}

      {/* User Account Panel Modal */}
      <UserAccountPanel
        isOpen={accountPanelOpen}
        onClose={() => setAccountPanelOpen(false)}
        user={user}
        isDarkMode={isDarkMode}
        onSignOut={handleSignOut}
        initialTab={accountPanelTab}
      />
</div>
  );
}
