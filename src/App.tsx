import React, { useState, useEffect } from "react";
import { motion as m, AnimatePresence } from "motion/react";
import {
  Calendar,
  MapPin,
  User,
  Instagram,
  Phone,
  ShieldAlert,
  CheckCircle,
  FileSpreadsheet,
} from "lucide-react";

import InvitationGenerator from "./components/InvitationGenerator";

const RSVP_CONFIG = {
  appsScriptUrl:
    "https://script.google.com/macros/s/AKfycbwB78a1EIrf0IVC1QzmSvdR6TQ8xNIrHybLTTr5Iu6goU7SS9mKsvylx-E-5uhk9cg/exec",
  eventKey: "sam-birthday-2026-private-key",
};

export default function App() {
  // Input Form States
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState<"Female" | "Male" | "">("");
  const [status, setStatus] = useState<"yes" | "no">("yes");
  const [femalePlusOnes, setFemalePlusOnes] = useState(0);
  const [malePlusOnes, setMalePlusOnes] = useState(0);
  const [notes, setNotes] = useState("");
  const [agreedToDisclaimer, setAgreedToDisclaimer] = useState(false);
  const [honeypot, setHoneypot] = useState("");

  // Form Submission/Status States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [heroImageError, setHeroImageError] = useState(false);

  useEffect(() => {
    if (malePlusOnes === 0) {
      setAgreedToDisclaimer(false);
    }
  }, [malePlusOnes]);

  // Handle RSVP Submit
  const handleRsvpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");
    setSubmitSuccess(false);

    if (honeypot) {
      // Spam detected
      setIsSubmitting(false);
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Please enter your name.");
      setIsSubmitting(false);
      return;
    }

    if (!instagram.trim()) {
      setErrorMessage("Please enter your Instagram account.");
      setIsSubmitting(false);
      return;
    }

    if (!gender) {
      setErrorMessage("Please select your gender.");
      setIsSubmitting(false);
      return;
    }

    if (
      !RSVP_CONFIG.appsScriptUrl ||
      RSVP_CONFIG.appsScriptUrl === "PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE"
    ) {
      setErrorMessage(
        "System configuration error: Database URL is missing. Please contact the host.",
      );
      setIsSubmitting(false);
      return;
    }

    const needsSplitAgreement = malePlusOnes > 0;
    if (needsSplitAgreement && !agreedToDisclaimer && status === "yes") {
      setErrorMessage(
        "Please signify your agreement to the bill split policy.",
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const payload = {
        timestamp: new Date().toISOString(),
        guestName: name.trim().slice(0, 100),
        instagram: instagram.trim().slice(0, 150),
        phone: phone.trim().slice(0, 50),
        gender,
        attendingStatus: status,
        femalePlusOnes,
        malePlusOnes,
        notes: notes.trim().slice(0, 500),
        eventKey: RSVP_CONFIG.eventKey,
        honeypot,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetch(RSVP_CONFIG.appsScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }

      let result;
      try {
        result = await response.json();
      } catch (err) {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        } else {
          throw new Error("Invalid response format from server.");
        }
      }

      if (result && result.ok === true) {
        setSubmitSuccess(true);
        // Reset inputs on success except keeping standard visual response
        setName("");
        setInstagram("");
        setPhone("");
        setGender("");
        setStatus("yes");
        setFemalePlusOnes(0);
        setMalePlusOnes(0);
        setNotes("");
        setAgreedToDisclaimer(false);
      } else {
        setErrorMessage(
          result?.message ||
            result?.error ||
            "Submission failed. Please try again.",
        );
      }
    } catch (error: any) {
      console.error("Submission error:", error);
      if (error.name === "AbortError") {
        setErrorMessage("RSVP submission timed out. Please try again.");
      } else {
        setErrorMessage(
          "Network error occurred. Please ensure your connection is active and try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white text-[#1E1B15] font-sans flex flex-col justify-between selection:bg-[#C5A16F]/30 selection:text-[#1E1B15]">
      {/* Top micro header */}
      <header className="px-6 py-4 flex justify-between items-center max-w-7xl w-full mx-auto">
        <m.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="font-serif italic font-medium text-[#C5A16F] text-lg tracking-tight"
        >
          S.
        </m.span>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            {/* ----- COMPLETED INVITATION FRONT VIEW ----- */}
            <m.div
              key="front-view"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start"
            >
              {/* LEFT COLUMN: EVENT DISPLAY */}
              <m.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.2 }}
                className="lg:col-span-6 space-y-8"
              >
                {/* Event Host Photo Integrated */}
                {!heroImageError && (
                  <div className="relative rounded-3xl overflow-hidden aspect-[4/5] sm:aspect-[4/3] w-full border border-[#C5A16F]/20 shadow-sm">
                    <img
                      src="/sam.png"
                      alt="Sam"
                      className="w-full h-full object-cover object-[center_15%] scale-110 origin-top"
                      onError={() => setHeroImageError(true)}
                    />
                  </div>
                )}

                {/* YOU ARE INVITED Badge */}
                <div className="uppercase tracking-widest text-[10px] text-[#C5A16F] font-sans font-semibold border border-[#C5A16F]/30 px-3.5 py-1.5 rounded-full w-fit bg-[#FAF5EE]/60 backdrop-blur-xs">
                  You Are Invited
                </div>

                {/* Header Title Typography Pairings */}
                <div className="relative">
                  <h1 className="font-serif text-[60px] sm:text-[76px] xl:text-[84px] leading-[1.05] text-[#1E1B15] tracking-tight font-light">
                    Sam's
                    <m.span
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8, delay: 0.4 }}
                      className="font-serif font-normal text-[#C5A16F] tracking-tight block ml-1 md:ml-3 mt-1 text-[40px] sm:text-[56px] xl:text-[60px]"
                    >
                      22歲的10週年紀念日
                    </m.span>
                  </h1>
                </div>

                {/* Event Sub-paragraph description */}
                <p className="font-sans text-[#5C5446] text-sm sm:text-base md:text-md leading-relaxed max-w-md font-light">
                  Join us for an exclusive, premier evening to celebrate Sam's
                  22歲的10週年紀念日 at Barcode. Expect great music, premium
                  drinks, and wonderful company. Let's make it a memorable
                  night.
                </p>

                <div className="h-[1px] w-full bg-[#C5A16F]/25" />

                {/* Event Details list */}
                <div className="space-y-6">
                  {/* Date Details */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 bg-[#FAF5EE]/70 rounded-2xl border border-[#C5A16F]/30 text-[#C5A16F] shadow-2xs">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm text-[#5C5446] tracking-wide uppercase font-semibold text-[10.5px]">
                        Date & Time
                      </h4>
                      <p className="text-[#1E1B15] font-medium mt-0.5">
                        Friday, July 17
                      </p>
                      <p className="text-[#5C5446] text-xs font-light font-mono mt-0.5">
                        Starting at 11:00 PM
                      </p>
                    </div>
                  </div>

                  {/* Venue Details */}
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 p-3 bg-[#FAF5EE]/70 rounded-2xl border border-[#C5A16F]/30 text-[#C5A16F] shadow-2xs">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-serif text-sm text-[#5C5446] tracking-wide uppercase font-semibold text-[10.5px]">
                        Venue Location
                      </h4>
                      <p className="text-[#1E1B15] font-medium mt-0.5">
                        Barcode Taipei · Xinyi
                      </p>
                      <p className="text-[#5C5446] text-xs font-light mt-0.5">
                        5F, No. 22, Songshou Road, Xinyi District, Taipei City,
                        Taiwan
                      </p>
                    </div>
                  </div>
                </div>

                {/* Aesthetic wallet warnings / wallet surcharges box */}
                <m.div
                  whileHover={{ scale: 1.01 }}
                  className="p-5 sm:p-6 bg-[#FAF5EE]/40 border border-[#C5A16F]/20 rounded-3xl space-y-2.5 shadow-2xs"
                >
                  <div className="flex items-center gap-2 text-[#917646]">
                    <ShieldAlert className="w-4 h-4 text-[#C5A16F]" />
                    <h4 className="font-sans font-bold text-xs uppercase tracking-wider text-[#C5A16F]">
                      Pocket-split Surcharge Note
                    </h4>
                  </div>
                  <p className="font-light text-xs leading-relaxed text-[#5C5446]">
                    We welcome everybody to celebrate and enjoy together. But!
                    If anyone would like to bring guy friends, please know that
                    those guy friends will have to open up their own wallet and
                    split <strong>2,000 - 3,000 NTD</strong> with the birthday
                    boy. Even if they did not drink or participate.
                  </p>
                </m.div>
              </m.div>

              {/* RIGHT COLUMN: EVENT RSVP FORM CARD CARD */}
              <m.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.7, delay: 0.3 }}
                className="lg:col-span-6 bg-[#FCFAF6] rounded-[32px] p-6 sm:p-8 lg:p-10 border border-[#C5A16F]/25 shadow-xs relative overflow-hidden"
              >
                <AnimatePresence mode="wait">
                  {submitSuccess ? (
                    /* SUCCESS SCREEN STATE */
                    <m.div
                      key="success-form"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="py-12 text-center text-[#1E1B15] min-h-[480px] flex flex-col justify-center items-center"
                    >
                      <m.div
                        className="mb-6 inline-flex p-4 rounded-full bg-green-50 text-green-500 border border-green-200"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", damping: 10 }}
                      >
                        <CheckCircle className="w-12 h-12" />
                      </m.div>
                      <h2 className="font-serif text-3xl mb-3 tracking-tight">
                        Seat Reserved!
                      </h2>
                      <p className="text-[#5C5446] text-sm font-light max-w-sm mx-auto leading-relaxed">
                        Your RSVP is submitted. Next, you can generate an IG
                        invitation to share with your friends.
                      </p>

                      <div className="w-full max-w-sm mt-6">
                        <div className="mb-5 text-left bg-white/50 border border-[#C5A16F]/10 rounded-xl p-4">
                          <p className="text-[10px] text-[#C5A16F] font-bold uppercase tracking-widest mb-2 pb-2 border-b border-[#C5A16F]/15">
                            Next Steps
                          </p>
                          <ul className="text-[11px] sm:text-xs text-[#5C5446] space-y-2">
                            <li className="flex items-start gap-2 leading-tight">
                              <span className="bg-[#1E1B15] text-[#FAF5EE] rounded-full w-4 h-4 flex items-center justify-center font-medium shrink-0 mt-0.5 text-[9px]">
                                3
                              </span>
                              <span>
                                <strong>Generate IG Invite</strong> (Upload a
                                photo if you want)
                              </span>
                            </li>
                            <li className="flex items-start gap-2 leading-tight">
                              <span className="bg-[#1E1B15] text-[#FAF5EE] rounded-full w-4 h-4 flex items-center justify-center font-medium shrink-0 mt-0.5 text-[9px]">
                                4
                              </span>
                              <span>
                                <strong>Download & Share</strong> to Instagram
                                Stories
                              </span>
                            </li>
                          </ul>
                        </div>
                        <div className="max-w-xs mx-auto">
                          <InvitationGenerator />
                        </div>
                      </div>

                      {/* Confirmation sheet badge */}
                      <div className="mt-8 bg-[#FAF5EE] px-5 py-3.5 rounded-2xl border border-[#C5A16F]/25 max-w-xs text-xs text-[#5C5446] font-light space-y-1">
                        <p className="font-medium text-[#1E1B15] flex items-center justify-center gap-1">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-[#C5A16F]" />
                          RSVP Submitted
                        </p>
                        <p className="text-[10px] text-[#5C5446]">
                          Your RSVP has been sent to the guest list.
                        </p>
                      </div>

                      <button
                        onClick={() => setSubmitSuccess(false)}
                        className="mt-8 text-xs font-semibold uppercase tracking-widest text-[#C5A16F] hover:text-[#1E1B15] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        Modify details / Register another guest
                      </button>
                    </m.div>
                  ) : (
                    /* PRIMARY RSVP FORM CARD STATE */
                    <m.div
                      key="rsvp-inputs-form"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className="mb-6 border-b border-[#C5A16F]/20 pb-6">
                        <h2 className="font-serif text-3xl text-[#1E1B15] tracking-tight mb-2">
                          Reserve Your Spot
                        </h2>

                        <div className="space-y-1.5 pt-2">
                          <p className="text-[#5C5446] text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-[#1E1B15] text-[#FAF5EE] flex items-center justify-center text-[9px]">
                              1
                            </span>{" "}
                            Fill out RSVP
                          </p>
                          <p className="text-[#5C5446] text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-[#1E1B15] text-[#FAF5EE] flex items-center justify-center text-[9px]">
                              2
                            </span>{" "}
                            Send reservation
                          </p>
                          <p className="text-[#5C5446]/50 text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-400 flex items-center justify-center text-[9px]">
                              3
                            </span>{" "}
                            Upload a photo if you want
                          </p>
                          <p className="text-[#5C5446]/50 text-[11px] font-medium tracking-wide uppercase flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-neutral-200 text-neutral-400 flex items-center justify-center text-[9px]">
                              4
                            </span>{" "}
                            Download / share IG invite
                          </p>
                        </div>
                      </div>

                      {errorMessage && (
                        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-600 flex items-start gap-2.5">
                          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                          <span>{errorMessage}</span>
                        </div>
                      )}

                      <form onSubmit={handleRsvpSubmit} className="space-y-5">
                        {/* Hidden Honeypot Input for Bot Prevention */}
                        <div className="hidden" aria-hidden="true">
                          <label htmlFor="website">Website</label>
                          <input
                            type="text"
                            name="website"
                            id="website"
                            value={honeypot}
                            onChange={(e) => setHoneypot(e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>

                        {/* Name Input */}
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-1.5 font-medium">
                            Guest Name
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A16F]">
                              <User className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              required
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="First & Last Name"
                              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E5DFC9] focus:outline-hidden focus:border-[#C5A16F] text-[#1E1B15] text-sm transition font-light placeholder:text-neutral-400"
                            />
                          </div>
                        </div>

                        {/* Instagram Input */}
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-1.5 font-medium">
                            Instagram
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A16F]">
                              <Instagram className="w-4 h-4" />
                            </span>
                            <input
                              type="text"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="@username"
                              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E5DFC9] focus:outline-hidden focus:border-[#C5A16F] text-[#1E1B15] text-sm transition font-light placeholder:text-neutral-400"
                            />
                          </div>
                        </div>

                        {/* Gender Selection */}
                        <div className="pt-2 pb-1">
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-2 font-medium">
                            Gender
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label
                              className={`
                              flex items-center justify-center p-3 sm:p-4 border rounded-2xl cursor-pointer transition-all duration-200 
                              ${gender === "Female" ? "bg-[#FAF5EE] border-[#C5A16F] text-[#1E1B15] shadow-xs" : "bg-white border-[#E5DFC9] text-[#8e8476] hover:bg-neutral-50"}
                            `}
                            >
                              <input
                                type="radio"
                                name="gender"
                                value="Female"
                                className="sr-only"
                                checked={gender === "Female"}
                                onChange={() => setGender("Female")}
                              />
                              <span className="font-medium text-sm">
                                Female
                              </span>
                            </label>

                            <label
                              className={`
                              flex items-center justify-center p-3 sm:p-4 border rounded-2xl cursor-pointer transition-all duration-200 
                              ${gender === "Male" ? "bg-[#FAF5EE] border-[#C5A16F] text-[#1E1B15] shadow-xs" : "bg-white border-[#E5DFC9] text-[#8e8476] hover:bg-neutral-50"}
                            `}
                            >
                              <input
                                type="radio"
                                name="gender"
                                value="Male"
                                className="sr-only"
                                checked={gender === "Male"}
                                onChange={() => setGender("Male")}
                              />
                              <span className="font-medium text-sm">Male</span>
                            </label>
                          </div>
                        </div>

                        {/* Phone Input (Optional) */}
                        <div>
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-1.5 font-medium">
                            Phone Number{" "}
                            <span className="text-neutral-400 font-normal lowercase">
                              (Optional)
                            </span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5A16F]">
                              <Phone className="w-4 h-4" />
                            </span>
                            <input
                              type="tel"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="e.g. +886 912345678"
                              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-[#E5DFC9] focus:outline-hidden focus:border-[#C5A16F] text-[#1E1B15] text-sm transition font-light font-mono placeholder:font-sans placeholder:text-neutral-400"
                            />
                          </div>
                        </div>

                        {/* Selection Attendance option */}
                        <div className="pt-2 pb-1">
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-2 font-medium">
                            Attending?
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label
                              className={`
                              flex items-center justify-center p-3 sm:p-4 border rounded-2xl cursor-pointer transition-all duration-200 
                              ${status === "yes" ? "bg-[#FAF5EE] border-[#C5A16F] text-[#1E1B15] shadow-xs" : "bg-white border-[#E5DFC9] text-[#8e8476] hover:bg-neutral-50"}
                            `}
                            >
                              <input
                                type="radio"
                                name="status"
                                value="yes"
                                className="sr-only"
                                checked={status === "yes"}
                                onChange={() => {
                                  setStatus("yes");
                                }}
                              />
                              <span className="font-medium text-sm">
                                Right On
                              </span>
                            </label>

                            <label
                              className={`
                              flex items-center justify-center p-3 sm:p-4 border rounded-2xl cursor-pointer transition-all duration-200 
                              ${status === "no" ? "bg-neutral-100 border-neutral-300 text-neutral-800 shadow-xs" : "bg-white border-[#E5DFC9] text-[#8e8476] hover:bg-neutral-50"}
                            `}
                            >
                              <input
                                type="radio"
                                name="status"
                                value="no"
                                className="sr-only"
                                checked={status === "no"}
                                onChange={() => {
                                  setStatus("no");
                                  setFemalePlusOnes(0);
                                  setMalePlusOnes(0);
                                  setAgreedToDisclaimer(false);
                                }}
                              />
                              <span className="font-medium text-sm">
                                Cannot Make it
                              </span>
                            </label>
                          </div>
                        </div>

                        {/* Conditional inputs if attending */}
                        <AnimatePresence>
                          {status === "yes" && (
                            <m.div
                              initial={{
                                opacity: 0,
                                height: 0,
                                overflow: "hidden",
                              }}
                              animate={{
                                opacity: 1,
                                height: "auto",
                                overflow: "visible",
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                                overflow: "hidden",
                              }}
                              transition={{ duration: 0.3 }}
                              className="space-y-5 border-t border-dashed border-[#C5A16F]/30 pt-5 mt-2"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-2">
                                <div>
                                  <label className="block text-[11px] uppercase tracking-wider text-[#5C5446] mb-2 font-medium">
                                    Female Plus Ones
                                  </label>
                                  <div className="flex bg-white rounded-xl border border-[#E5DFC9] overflow-hidden p-1 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFemalePlusOnes(
                                          Math.max(0, femalePlusOnes - 1),
                                        )
                                      }
                                      className="flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all text-[#8e8476] hover:bg-neutral-50"
                                    >
                                      -
                                    </button>
                                    <div className="flex-1 py-1.5 sm:py-2 text-xs font-semibold text-center flex items-center justify-center pt-2 px-3 min-w-[40px] border-x border-[#E5DFC9]/50">
                                      {femalePlusOnes}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setFemalePlusOnes(
                                          Math.min(10, femalePlusOnes + 1),
                                        )
                                      }
                                      className="flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all text-[#8e8476] hover:bg-neutral-50"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-[11px] uppercase tracking-wider text-[#5C5446] mb-2 font-medium">
                                    Male Plus Ones
                                  </label>
                                  <div className="flex bg-white rounded-xl border border-[#E5DFC9] overflow-hidden p-1 shadow-xs">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMalePlusOnes(
                                          Math.max(0, malePlusOnes - 1),
                                        )
                                      }
                                      className="flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all text-[#8e8476] hover:bg-neutral-50"
                                    >
                                      -
                                    </button>
                                    <div className="flex-1 py-1.5 sm:py-2 text-xs font-semibold text-center flex items-center justify-center pt-2 px-3 min-w-[40px] border-x border-[#E5DFC9]/50">
                                      {malePlusOnes}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setMalePlusOnes(
                                          Math.min(10, malePlusOnes + 1),
                                        )
                                      }
                                      className="flex-1 py-1.5 sm:py-2 text-xs font-semibold rounded-lg transition-all text-[#8e8476] hover:bg-neutral-50"
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </div>

                              {/* Nested condition: Disclaimer if bringing guys */}
                              <AnimatePresence>
                                {malePlusOnes > 0 && (
                                  <m.div
                                    initial={{ opacity: 0, y: -10, height: 0 }}
                                    animate={{
                                      opacity: 1,
                                      y: 0,
                                      height: "auto",
                                    }}
                                    exit={{ opacity: 0, y: -10, height: 0 }}
                                    className="pt-2 pb-2"
                                  >
                                    <label className="flex items-start gap-3 p-3 sm:p-4 rounded-2xl border border-amber-200 bg-amber-50 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={agreedToDisclaimer}
                                        onChange={(e) =>
                                          setAgreedToDisclaimer(
                                            e.target.checked,
                                          )
                                        }
                                        className="mt-1 w-4 h-4 sm:w-5 sm:h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500 cursor-pointer flex-shrink-0"
                                      />
                                      <span className="text-[10px] sm:text-xs text-amber-900 leading-snug">
                                        I formally swear the guy friends I
                                        invited will split the 2,000 - 3,000 NTD
                                        pocket-fee with the Host.
                                      </span>
                                    </label>
                                  </m.div>
                                )}
                              </AnimatePresence>
                            </m.div>
                          )}
                        </AnimatePresence>

                        {/* Any extra notes? */}
                        <div className="pt-2">
                          <label className="block text-xs uppercase tracking-wider text-[#5C5446] mb-1.5 font-medium">
                            Extra Notes{" "}
                            <span className="text-neutral-400 font-normal lowercase">
                              (Optional)
                            </span>
                          </label>
                          <textarea
                            rows={3}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Allergies, cheers to the host, etc..."
                            className="w-full px-4 py-3 rounded-2xl bg-white border border-[#E5DFC9] focus:outline-hidden focus:border-[#C5A16F] text-[#1E1B15] text-sm transition font-light resize-none placeholder:text-neutral-400"
                          ></textarea>
                        </div>

                        {/* Submit Action */}
                        <div className="pt-4">
                          <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-[#1E1B15] text-[#FAF5EE] rounded-2xl py-4 sm:py-5 font-bold tracking-widest uppercase text-xs sm:text-sm hover:bg-neutral-800 active:scale-[0.99] transition duration-300 shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {isSubmitting ? (
                              <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                            ) : (
                              "Send Reservation"
                            )}
                          </button>
                        </div>
                      </form>
                    </m.div>
                  )}
                </AnimatePresence>
              </m.div>
            </m.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Footer footprint */}
      <footer className="py-8 text-center text-[10px] uppercase tracking-[0.2em] text-[#A68F72] font-semibold flex flex-col items-center gap-1.5">
        <p>11:00 PM · Exclusive Pass</p>
        <p className="font-mono text-[#D2C5B3]">
          © {new Date().getFullYear()} RSVP Systems
        </p>
      </footer>
    </div>
  );
}
