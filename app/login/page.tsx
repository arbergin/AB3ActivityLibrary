"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import { signInWithEmailPassword } from "@/lib/supabaseAuth";

type PossibleSignInResult =
  | {
      session?: {
        access_token?: string | null;
      } | null;
      data?: {
        session?: {
          access_token?: string | null;
        } | null;
      } | null;
    }
  | undefined
  | null;

type FeatureRowProps = {
  title: string;
  videoSrc: string;
  videoPosition?: "left" | "right";
};

type FAQItem = {
  question: string;
  answer: React.ReactNode;
};


function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems: FAQItem[] = [
    {
      question: "Where do my activities go after I save them?",
      answer: (
        <div className="space-y-4">
          <p>
            Once you create an activity, you can save it to your own private
            Activity Library.
          </p>

          <ul className="space-y-3 pl-5">
            <li className="list-square">
              If your account is connected to a club, you can also save
              activities to your Club Library so other coaches in your club can
              access and share them.
            </li>
            <li className="list-square">
              You can choose to make an activity available to the public AB3
              Activity Library, allowing other coaches to find and use it.
            </li>
            <li className="list-square">
              Activities can also be downloaded directly to the AB3 Activity
              Planner on your iPhone or iPad, so you can take them with you when
              planning or coaching.
            </li>
          </ul>
        </div>
      ),
    },
    {
      question: "Can I use AB3 on both the web and my iPhone or iPad?",
      answer: (
        <p>
          Yes. The AB3 Activity Library works alongside the AB3 Activity Planner
          for iOS. You can create and organize activities online, download them
          to your iPhone or iPad, and upload activities created in the app back
          to your online library.
        </p>
      ),
    },
    {
      question: "Can I create my own soccer activities?",
      answer: (
        <p>
          Yes. The built-in Activity Creator lets you design activities using
          players, cones, balls, goals, lines, text, and other coaching tools.
          You can then add details such as activity type, phase of play, field
          location, positions involved, and number of players.
        </p>
      ),
    },
    {
      question: "Can I search for activities instead of creating everything myself?",
      answer: (
        <p>
          Absolutely. You can search the Activity Library using the details
          attached to each activity, making it easier to find something that
          fits what you are working on rather than digging through folders or
          old PDFs.
        </p>
      ),
    },
    {
      question: "Can other coaches see my activities?",
      answer: (
        <p>
          Only if you want them to. When saving an activity, you can control who
          has access. Activities can be kept Private, shared with your Club, or
          made available to Everyone.
        </p>
      ),
    },
    {
      question: "Can I organize activities for future practices?",
      answer: (
        <p>
          Yes. You can use AB3 to build out practices and organize activities
          into your team and season planning rather than keeping everything
          scattered across documents, notes, screenshots, and spreadsheets.
        </p>
      ),
    },
    {
      question: "Can I download or print my activities?",
      answer: (
        <p>
          Yes. Activities can be downloaded for use outside the site, including
          formats that are easy to save, share, or print for a training session.
        </p>
      ),
    },
    {
      question: "Do I have to belong to a club to use AB3?",
      answer: (
        <p>
          No. Individual coaches can use AB3 with their own private library.
          Club accounts simply add the ability to share activities and planning
          resources among coaches within the same club.
        </p>
      ),
    },
  ];

  return (
    <section className="mt-12 border-t border-slate-200 pt-9">
      <div className="mb-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
          Frequently Asked Questions
        </p>
        <h2 className="mt-2 text-3xl font-black text-[#0d2140] sm:text-4xl">
          A few things coaches usually want to know
        </h2>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg">
        {faqItems.map((item, index) => {
          const isOpen = openIndex === index;

          return (
            <div
              key={item.question}
              className="border-t border-slate-200 first:border-t-0"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="flex w-full items-center justify-between gap-5 px-5 py-5 text-left transition hover:bg-slate-50 sm:px-7 sm:py-6"
                aria-expanded={isOpen}
              >
                <span className="text-lg font-bold leading-7 text-[#0d2140] sm:text-xl">
                  {item.question}
                </span>

                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition ${
                    isOpen
                      ? "border-[#0d2140] bg-[#0d2140] text-white"
                      : "border-slate-400 text-slate-500"
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  >
                    <path d="M5 12h14" />
                    {!isOpen && <path d="M12 5v14" />}
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-6 sm:px-7 sm:pb-7">
                  <div className="max-w-4xl text-base leading-7 text-slate-700 sm:text-lg sm:leading-8">
                    {item.answer}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function getAccessTokenFromSignInResult(result: PossibleSignInResult) {
  return (
    result?.session?.access_token || result?.data?.session?.access_token || null
  );
}

function getSupabaseAccessTokenFromLocalStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);

    if (!key || !key.startsWith("sb-") || !key.endsWith("-auth-token")) {
      continue;
    }

    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      continue;
    }

    try {
      const parsedValue = JSON.parse(rawValue) as {
        access_token?: string;
        currentSession?: {
          access_token?: string;
        };
      };

      const accessToken =
        parsedValue.access_token || parsedValue.currentSession?.access_token;

      if (accessToken) {
        return accessToken;
      }
    } catch {
      // Ignore non-JSON local storage values.
    }
  }

  return null;
}

async function logSuccessfulLogin(accessToken: string) {
  const response = await fetch("/api/audit/login", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const responseBody = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;

    console.error(
      "Login succeeded, but the audit log could not be saved.",
      responseBody?.error || response.statusText
    );
  }
}

function FeatureRow({
  title,
  videoSrc,
  videoPosition = "right",
}: FeatureRowProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const instanceIdRef = useRef(Symbol(title));
  const hasAutoPlayedRef = useRef(false);
  const userHasScrolledRef = useRef(false);
  const savedPlaybackTimeRef = useRef(0);
  const shouldResumeAfterMoveRef = useRef(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const videoOnLeft = videoPosition === "left";

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleAnotherVideoStarted = (event: Event) => {
      const customEvent = event as CustomEvent<symbol>;

      if (customEvent.detail === instanceIdRef.current) {
        return;
      }

      const video = videoRef.current;

      if (video && !video.paused) {
        video.pause();
      }
    };

    window.addEventListener(
      "ab3-how-it-works-video-started",
      handleAnotherVideoStarted
    );

    return () => {
      window.removeEventListener(
        "ab3-how-it-works-video-started",
        handleAnotherVideoStarted
      );
    };
  }, []);

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeExpandedVideo();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  useEffect(() => {
    let animationFrameId: number | null = null;

    const checkVideoPosition = () => {
      animationFrameId = null;

      if (
        isExpanded ||
        hasAutoPlayedRef.current ||
        !userHasScrolledRef.current
      ) {
        return;
      }

      const video = videoRef.current;

      if (!video) {
        return;
      }

      const videoTop = video.getBoundingClientRect().top;
      const topFortyPercentBoundary = window.innerHeight * 0.4;

      if (videoTop < 0 || videoTop > topFortyPercentBoundary) {
        return;
      }

      hasAutoPlayedRef.current = true;
      video.currentTime = 0;
      announceVideoStarted();

      void video.play().catch((error) => {
        hasAutoPlayedRef.current = false;
        console.error(`The "${title}" video could not autoplay.`, error);
      });
    };

    const handleScroll = () => {
      userHasScrolledRef.current = true;

      if (
        isExpanded ||
        hasAutoPlayedRef.current ||
        animationFrameId !== null
      ) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(checkVideoPosition);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);

      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isExpanded, title]);

  function announceVideoStarted() {
    window.dispatchEvent(
      new CustomEvent<symbol>("ab3-how-it-works-video-started", {
        detail: instanceIdRef.current,
      })
    );
  }

  function restorePlaybackState(video: HTMLVideoElement) {
    const restoreTime = () => {
      if (Number.isFinite(savedPlaybackTimeRef.current)) {
        video.currentTime = savedPlaybackTimeRef.current;
      }

      if (shouldResumeAfterMoveRef.current) {
        announceVideoStarted();

        void video.play().catch((error) => {
          console.error(`The "${title}" video could not resume.`, error);
        });
      } else {
        video.pause();
      }
    };

    if (video.readyState >= 1) {
      restoreTime();
    } else {
      video.addEventListener("loadedmetadata", restoreTime, { once: true });
    }
  }

  function handleLoadedData() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (savedPlaybackTimeRef.current > 0 || shouldResumeAfterMoveRef.current) {
      restorePlaybackState(video);
      return;
    }

    if (hasAutoPlayedRef.current) {
      return;
    }

    video.pause();

    if (video.duration > 0) {
      video.currentTime = Math.min(0.01, video.duration);
    }
  }

  function handleVideoClick() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    hasAutoPlayedRef.current = true;
    video.currentTime = 0;
    announceVideoStarted();

    void video.play().catch((error) => {
      console.error(`The "${title}" video could not replay.`, error);
    });
  }

  function openExpandedVideo() {
    const video = videoRef.current;

    if (video) {
      savedPlaybackTimeRef.current = video.currentTime;
      shouldResumeAfterMoveRef.current = !video.paused && !video.ended;
      video.pause();
    }

    setIsExpanded(true);
  }

  function closeExpandedVideo() {
    const video = videoRef.current;

    if (video) {
      savedPlaybackTimeRef.current = video.currentTime;
      shouldResumeAfterMoveRef.current = !video.paused && !video.ended;
      video.pause();
    }

    setIsExpanded(false);
  }

  function renderVideo(isModal: boolean) {
    return (
      <div
        className={
          isModal
            ? "relative w-full max-w-6xl overflow-hidden rounded-2xl bg-black shadow-2xl"
            : "relative overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg"
        }
      >
        <video
          ref={videoRef}
          src={videoSrc}
          muted
          playsInline
          preload="auto"
          onLoadedData={handleLoadedData}
          onClick={handleVideoClick}
          className={
            isModal
              ? "block max-h-[88vh] w-full cursor-pointer bg-black object-contain"
              : "block aspect-video w-full cursor-pointer bg-slate-100 object-cover"
          }
          aria-label={`${title}. Click to replay.`}
          title="Click to replay"
        />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            if (isModal) {
              closeExpandedVideo();
            } else {
              openExpandedVideo();
            }
          }}
          className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-950/75 text-white shadow-lg backdrop-blur-sm transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-white"
          aria-label={
            isModal ? `Close enlarged ${title} video` : `Enlarge ${title} video`
          }
          title={isModal ? "Close enlarged video" : "Enlarge video"}
        >
          {isModal ? (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 3v6H3" />
              <path d="M15 21v-6h6" />
              <path d="M3 9l6-6" />
              <path d="M21 15l-6 6" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 3h6v6" />
              <path d="M9 21H3v-6" />
              <path d="M21 3l-7 7" />
              <path d="M3 21l7-7" />
            </svg>
          )}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid items-center gap-6 md:grid-cols-2 md:gap-10">
        <div
          className={`flex items-center justify-center md:min-h-[230px] ${
            videoOnLeft ? "md:order-2" : "md:order-1"
          }`}
        >
          <p className="max-w-sm text-center text-xl font-bold leading-8 text-[#0d2140] sm:text-2xl">
            {title}
          </p>
        </div>

        <div className={videoOnLeft ? "md:order-1" : "md:order-2"}>
          {isExpanded ? (
            <div className="aspect-video rounded-2xl border border-slate-300 bg-slate-100 shadow-lg" />
          ) : (
            renderVideo(false)
          )}
        </div>
      </div>

      {isMounted &&
        isExpanded &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 p-4 sm:p-8"
            onClick={(event) => {
              if (event.currentTarget === event.target) {
                closeExpandedVideo();
              }
            }}
          >
            {renderVideo(true)}
          </div>,
          document.body
        )}
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const completedVideoPlaysRef = useRef(0);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError("");

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setFormError("Email is required.");
      return;
    }

    if (!password) {
      setFormError("Password is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      const signInResult = (await signInWithEmailPassword(
        trimmedEmail,
        password
      )) as PossibleSignInResult;

      const accessToken =
        getAccessTokenFromSignInResult(signInResult) ||
        getSupabaseAccessTokenFromLocalStorage();

      if (accessToken) {
        await logSuccessfulLogin(accessToken);
      } else {
        console.error(
          "Login succeeded, but no Supabase access token was available for audit logging."
        );
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Login error.", error);

      if (error instanceof Error) {
        setFormError(error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleVideoEnded() {
    completedVideoPlaysRef.current += 1;

    if (completedVideoPlaysRef.current >= 2) {
      return;
    }

    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.currentTime = 0;

    void video.play().catch((error) => {
      console.error("The login video could not restart.", error);
    });
  }

  function handleVideoClick() {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    completedVideoPlaysRef.current = 2;
    video.currentTime = 0;

    void video.play().catch((error) => {
      console.error("The login video could not replay.", error);
    });
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <AppHeader />

      <section className="relative min-h-[calc(100vh-72px)] overflow-visible px-4 pb-8 pt-4 sm:px-6 lg:px-10 lg:pb-10 lg:pt-5">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[url('/login-background.png')] bg-[length:100%_auto] bg-top bg-repeat-y opacity-65"
        />

        <div aria-hidden="true" className="absolute inset-0 bg-slate-100/20" />

        <div className="relative z-10 mx-auto grid w-full max-w-[1380px] items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 xl:max-w-[1480px] xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className="flex items-start justify-center lg:col-start-1 lg:row-start-1 lg:justify-end">
            <div className="w-full max-w-[940px] overflow-hidden rounded-[28px] border border-slate-900/70 bg-white/90 shadow-2xl backdrop-blur-sm">
              <video
                ref={videoRef}
                src="/login.mp4"
                autoPlay
                muted
                playsInline
                preload="auto"
                onEnded={handleVideoEnded}
                onClick={handleVideoClick}
                className="block aspect-[16/9] w-full cursor-pointer bg-white object-cover"
                aria-label="AB3 Soccer Activity Library introduction. Click to replay."
                title="Click to replay"
              />
            </div>
          </div>

          <aside
            id="login-form"
            className="scroll-mt-[88px] self-start lg:sticky lg:top-[88px] lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:justify-self-end"
          >
            <div className="w-full rounded-2xl bg-white/92 p-5 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-6 lg:max-w-[300px] xl:max-w-[290px]">
              <div className="mb-5">
                <h2 className="text-xl font-bold">Login</h2>

                <p className="mt-2 text-sm text-slate-600">
                  Log in to your AB3 Activity Library account.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-sm font-semibold">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2"
                    placeholder="you@example.com"
                    autoComplete="email"
                  />
                </label>

                <label className="grid gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">Password</span>

                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#0d2140]"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2"
                    placeholder="Enter your password"
                    autoComplete="current-password"
                  />
                </label>

                {formError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-[#0d2140] px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </form>

              <div className="mt-5 grid gap-3">
                <Link
                  href="/signup"
                  className="inline-flex w-full justify-center rounded-lg border border-[#0d2140] bg-white px-4 py-2 font-bold text-[#0d2140] transition hover:bg-slate-50"
                >
                  Create Account
                </Link>

                <Link
                  href="/pricing"
                  className="text-center text-sm font-semibold text-[#0d2140] underline"
                >
                  View subscription options
                </Link>
              </div>
            </div>
          </aside>

          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-[940px] rounded-[28px] bg-white/92 p-6 shadow-xl ring-1 ring-slate-200/80 backdrop-blur-sm sm:p-8 lg:col-start-1 lg:row-start-2">
              <section>
                <h1 className="text-3xl font-black leading-tight text-[#0d2140] sm:text-4xl">
                  Create, organize, and find your soccer activities—all in one
                  user-friendly library.
                </h1>

                <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
                  AB3 makes it easy to build professional training activities,
                  add searchable details, create animations, and keep
                  everything organized for quick access when planning sessions.
                </p>
              </section>

              <section className="mt-10 border-t border-slate-200 pt-9">
                <div className="mb-8">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                    AB3 Activity Library
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#0d2140] sm:text-4xl">
                    How it works
                  </h2>
                </div>

                <div className="grid gap-10 sm:gap-12">
                  <FeatureRow
                    title="Easily create activities"
                    videoSrc="/CreateActivity.mp4"
                  />
                  <FeatureRow
                    title="Export and take them to the pitch"
                    videoSrc="/SearchExport.mp4"
                    videoPosition="left"
                  />
                  <FeatureRow
                    title="Turn activities into animations to send to players or share on social media"
                    videoSrc="/ActivityAnimation.mp4"
                  />
                  <FeatureRow
                    title="Organize activities with searchable details"
                    videoSrc="/SaveActivity.mp4"
                    videoPosition="left"
                  />
                  <FeatureRow
                    title="Quickly open and edit saved activities"
                    videoSrc="/EditActivity.mp4"
                  />
                </div>
              </section>

              <section className="mt-12 border-t border-slate-200 pt-9">
                <div className="rounded-3xl bg-[#0d2140] p-6 text-white shadow-lg sm:p-8">
                  <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">
                        AB3 Activity Planner
                      </p>
                      <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                        Sync with the iOS app
                      </h2>
                      <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">
                        Create activities in the iOS app while offline, upload
                        them later, and continue editing or organizing them on
                        your computer.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-4 sm:flex-nowrap">
                      <Link
                        href="https://apps.apple.com/us/app/ab3-soccer-activity-planner/id6778624821"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open AB3 Soccer Activity Planner in the App Store"
                        className="transition hover:-translate-y-1"
                      >
                        <img
                          src="/AB3Icon.png"
                          alt="AB3 Activity Planner app icon"
                          className="h-28 w-28 rounded-[22%] object-contain shadow-xl sm:h-32 sm:w-32"
                        />
                      </Link>

                      <Link
                        href="https://apps.apple.com/us/app/ab3-soccer-activity-planner/id6778624821"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Scan or open the AB3 Activity Planner App Store listing"
                        className="rounded-2xl bg-white p-2 shadow-xl transition hover:-translate-y-1"
                      >
                        <img
                          src="/AB3QR.png"
                          alt="QR code for the AB3 Activity Planner App Store listing"
                          className="h-28 w-28 object-contain sm:h-32 sm:w-32"
                        />
                      </Link>
                    </div>
                  </div>

                  <div className="mt-7 flex justify-center lg:justify-start">
                    <Link
                      href="https://apps.apple.com/us/app/ab3-soccer-activity-planner/id6778624821"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex transition hover:-translate-y-0.5"
                    >
                      <img
                        src="/AppleStore.jpg"
                        alt="Download on the App Store"
                        className="h-12 w-auto rounded-lg object-contain sm:h-14"
                      />
                    </Link>
                  </div>
                </div>
              </section>

              <section className="mt-12 border-t border-slate-200 pt-9">
                <div className="mb-8 text-center">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                    Simple pricing
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#0d2140] sm:text-4xl">
                    Professional tools without the professional-tool price
                  </h2>
                  <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-700 sm:text-lg">
                    Get the full AB3 Soccer Activity Library for a fraction of
                    the cost of competing tools that can run $60 or more per
                    year and don't even have an iOS app for offline activity creation.
                  </p>
                </div>

                <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-lg sm:p-8">
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                      Monthly
                    </p>
                    <div className="mt-4 flex items-end justify-center gap-1 text-[#0d2140]">
                      <span className="text-5xl font-black">$1.99</span>
                      <span className="pb-1 text-base font-semibold text-slate-500">
                        /month
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">
                      Flexible month-to-month access with no long-term
                      commitment.
                    </p>
                  </div>

                  <div className="relative rounded-3xl border-2 border-[#0d2140] bg-[#0d2140] p-6 text-center text-white shadow-xl sm:p-8">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-xs font-black uppercase tracking-wide text-white shadow-md">
                      Best value
                    </div>
                    <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-300">
                      Annual
                    </p>
                    <div className="mt-4 flex items-end justify-center gap-1">
                      <span className="text-5xl font-black">$14.99</span>
                      <span className="pb-1 text-base font-semibold text-slate-300">
                        /year
                      </span>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-200">
                      Save nearly 37% compared with paying monthly for a full
                      year.
                    </p>
                  </div>
                </div>

                <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-center">
                  <p className="font-bold text-emerald-900">
                    About $45 less per year than a $60 competitor subscription.
                  </p>
                </div>
              </section>

              <section className="mt-12 border-t border-slate-200 pt-9">
                <div className="mb-7">
                  <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-500">
                    The person behind AB3
                  </p>
                  <h2 className="mt-2 text-3xl font-black text-[#0d2140] sm:text-4xl">
                    Built by a Coach
                  </h2>
                </div>

                <div className="grid items-start gap-7 md:grid-cols-[minmax(220px,0.8fr)_1.4fr] md:gap-9">
                  <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg">
                    <img
                      src="/CoachPic.jpeg"
                      alt="The coach who built AB3"
                      className="aspect-[4/5] h-full w-full object-cover"
                    />
                  </div>

                  <div className="rounded-3xl border border-slate-200 bg-slate-50/90 p-6 sm:p-7">
                    <p className="text-lg leading-8 text-slate-700">
                      I like to think of myself as the premier local,
                      non-platform U13 coach of moderately-sized midwestern
                      cities.
                    </p>

                    <p className="mt-5 text-lg leading-8 text-slate-700">
                      I was unhappy with the current tools out there—complicated,
                      over-engineered, still missing what I needed, and the price
                      (in this economy??)...
                      So I set out to build the tool I wanted to
                      use myself.
                    </p>

                     <p className="mt-5 text-lg leading-8 text-slate-700">
                    And then I thought, well, maybe some other coaches could get
                    some use out of it too.
                  </p>
                  </div>
                </div>

                <div className="mt-8 rounded-3xl bg-slate-50/90 p-6 ring-1 ring-slate-200 sm:p-8">
                  <p className="text-xl font-semibold leading-8 text-[#0d2140] sm:text-2xl sm:leading-9">
                    My guiding principle in designing this website is the same
                    as my coaching philosophy: do the simple things
                    really, really well.
                  </p>

                  <Link
                    href="/about"
                    className="mt-6 inline-flex rounded-lg bg-[#0d2140] px-5 py-3 font-bold text-white shadow-md transition hover:bg-[#17345f]"
                  >
                    Learn more about me and my coaching philosophy
                  </Link>
                </div>
              </section>

              <FAQSection />

              <footer className="mt-12 border-t border-slate-200 pt-6">
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-semibold text-slate-600">
                  <Link
                    href="/terms-of-service"
                    className="transition hover:text-[#0d2140]"
                  >
                    Terms of Service
                  </Link>
                  <Link
                    href="/refund-policy"
                    className="transition hover:text-[#0d2140]"
                  >
                    Refund Policy
                  </Link>
                  <Link
                    href="/privacy-policy"
                    className="transition hover:text-[#0d2140]"
                  >
                    Privacy Policy
                  </Link>
                  <a
                    href="mailto:Support@ab3soccer.com"
                    className="transition hover:text-[#0d2140]"
                  >
                    Support@ab3soccer.com
                  </a>
                </div>

                <p className="mt-3 text-center text-xs text-slate-500">
                  © 2026 AB3 Analytics, LLC. All rights reserved.
                </p>
              </footer>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
