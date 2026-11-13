import { useState, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
} from "framer-motion";

import { useFormik } from "formik";
import * as Yup from "yup";

import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
  X,
  CheckCircle,
  Layers,
  FileText,
  Loader2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { loginUser, getMe } from "../services/authService";
import {
  setAuthSession,
  setUser,
  isAuthenticated,
  clearAuthSession,
} from "../utils/auth";

export default function LoginPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated()) {
      navigate("/project-tools");
    }
  }, []);

  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [isGuestSigningIn, setIsGuestSigningIn] = useState(false);

  const handleGuestLogin = async () => {
    try {
      setIsGuestSigningIn(true);
      setLoginError("");

      // Clear any previous stale session cookies
      clearAuthSession();

      const { accessToken, refreshToken } = await loginUser({
        email: "guest@gmail.com",
        password: "password",
      });

      setAuthSession({ accessToken, refreshToken, user: null });
      const user = await getMe();
      setUser(user);

      navigate("/project-tools");
    } catch (error) {
      console.error("[handleGuestLogin] Login failed:", error);
      setLoginError(
        error.response?.data?.detail ||
          error.message ||
          "Failed to sign in as guest account.",
      );
    } finally {
      setIsGuestSigningIn(false);
    }
  };

  // Auto-playing carousel timer
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const features = [
    {
      title: "Precision Engineering",
      desc: "Empower your structural calculations with high precision based on the latest engineering standards.",
      icon: <CheckCircle className="w-8 h-8 md:w-10 md:h-10 text-[#3399cc]" />,
    },
    {
      title: "All-in-One Workflow",
      desc: "Stop juggling separate design and calculation tasks. Streamline everything into one seamless platform.",
      icon: <Layers className="w-8 h-8 md:w-10 md:h-10 text-[#3399cc]" />,
    },
    {
      title: "Instant Validation",
      desc: "Get immediate OK/NG calculation reports to ensure your structures are completely safe for deployment.",
      icon: <FileText className="w-8 h-8 md:w-10 md:h-10 text-[#3399cc]" />,
    },
  ];

  // Interactive Background
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ currentTarget, clientX, clientY }) => {
    const { left, top } = currentTarget.getBoundingClientRect();

    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },

    validationSchema: Yup.object({
      email: Yup.string().required("Email or username is required"),

      password: Yup.string().required("Password is required"),
    }),

    onSubmit: async (values, { setSubmitting }) => {
      try {
        setLoginError("");

        const { accessToken, refreshToken } = await loginUser(values);

        // Set the tokens first so the /me request below can authenticate.
        setAuthSession({ accessToken, refreshToken, user: null });
        const user = await getMe();
        setUser(user);

        navigate("/project-tools");
      } catch (error) {
        setLoginError(
          error.response?.data?.detail ||
            error.message ||
            "Access denied. Please check your credentials.",
        );
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative min-h-screen bg-[#0d3b66] flex flex-col md:flex-row font-sans antialiased overflow-hidden"
    >
      {/* Interactive Gradient Spotlight (Cyan/Light Blue) */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-0 opacity-30"
        style={{
          background: useTransform(
            [mouseX, mouseY],
            ([x, y]) =>
              `radial-gradient(
                600px circle at ${x}px ${y}px,
                rgba(51, 153, 204, 0.2),
                transparent 70%
              )`,
          ),
        }}
      />

      {/* LEFT PANEL (Dark Blue) */}
      <div className="relative z-10 w-full md:w-[45%] lg:w-[40%] flex flex-col pt-10 pb-16 px-6 md:p-12 lg:p-20 text-white md:min-h-screen">
        {/* Top text */}
        <div className="hidden md:block mb-10">
          <p className="text-white/60 text-xs font-medium tracking-wide uppercase">
            Engineering-grade calculations
          </p>
        </div>

        {/* Center / Hero text */}
        <div className="text-center md:text-left">
          <h2 className="text-[32px] leading-[1.15] md:text-5xl lg:text-[54px] font-semibold md:leading-[1.1] tracking-tight">
            Design
            <br />
            Calculation
            <br />
            System
          </h2>
        </div>

        {/* Animated Features Carousel */}
        <div className="hidden md:flex flex-col justify-end flex-1 relative w-full max-w-[480px] mt-12 mb-10 mx-auto md:mx-0">
          <div className="relative w-full h-[220px] flex flex-col justify-end">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.5 }}
                className="absolute bottom-0 left-0 w-full"
              >
                <div className="flex items-center gap-4 mb-4">
                  {features[activeSlide].icon}
                  <h3 className="font-bold text-3xl lg:text-4xl text-white tracking-tight">
                    {features[activeSlide].title}
                  </h3>
                </div>
                <p className="text-white/80 text-lg md:text-xl leading-relaxed font-medium">
                  "{features[activeSlide].desc}"
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex gap-3 mt-10">
            {features.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-500 ${activeSlide === idx ? "w-8 bg-[#3399cc]" : "w-2 bg-white/20"}`}
              />
            ))}
          </div>
        </div>

        {/* Bottom text */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-bold text-[#3399cc] uppercase tracking-wider mt-auto">
          <ShieldCheck size={18} />
          Authorized Personnel Only
        </div>
      </div>

      {/* RIGHT PANEL (White) */}
      <div className="relative z-20 flex-1 bg-white rounded-t-[32px] md:rounded-t-none md:rounded-l-[40px] lg:rounded-l-[50px] shadow-[-20px_0_50px_rgba(0,0,0,0.15)] flex flex-col px-6 py-8 sm:p-12 lg:px-24 lg:py-16 overflow-y-auto -mt-6 md:mt-0">
        {/* Top Header: Logo */}
        <div className="flex items-center mb-10 md:mb-24">
          <div className="flex items-center gap-3">
            <img
              src="/images/koribali-logo.webp"
              alt="koribali icon"
              className="w-10 h-10 md:w-12 md:h-12 object-contain"
            />
            <span className="text-[18px] md:text-[22px] font-bold text-slate-800 tracking-tight">
              KORIBALI
            </span>
          </div>
        </div>

        {/* FORM CONTAINER */}
        <div className="w-full max-w-[420px] mx-auto flex-1 flex flex-col justify-center">
          <h1 className="text-[28px] md:text-4xl font-medium text-slate-800 tracking-tight mb-8 md:mb-12">
            Sign In
          </h1>

          <form onSubmit={formik.handleSubmit} className="space-y-5">
            {/* Error Alert */}
            <AnimatePresence mode="wait">
              {loginError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden mb-4"
                >
                  <div className="bg-red-50 border border-red-100 px-4 py-3 flex items-center justify-between text-red-700 text-[12px] font-semibold rounded-2xl">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={15} />
                      <span>{loginError}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setLoginError("")}
                      className="text-red-400 hover:text-red-600 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* EMAIL */}
            <div className="flex flex-col gap-1">
              <div className="relative group">
                <input
                  type="text"
                  placeholder="Email or Username"
                  {...formik.getFieldProps("email")}
                  className={`w-full bg-transparent border text-sm py-4 px-6 outline-none rounded-full transition-all ${
                    formik.touched.email && formik.errors.email
                      ? "border-red-300 ring-4 ring-red-50"
                      : "border-slate-200 hover:border-slate-300 focus:border-[#3399cc] focus:ring-4 focus:ring-[#3399cc]/10"
                  }`}
                />
              </div>

              <div className="h-5 ml-4 mt-1">
                {formik.touched.email && formik.errors.email && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-[11px] text-red-500 flex items-center gap-1.5"
                  >
                    <AlertCircle size={12} />
                    {formik.errors.email}
                  </motion.p>
                )}
              </div>
            </div>

            {/* PASSWORD */}
            <div className="flex flex-col gap-1">
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  {...formik.getFieldProps("password")}
                  className={`w-full bg-transparent border text-sm py-4 pl-6 pr-14 outline-none rounded-full transition-all ${
                    formik.touched.password && formik.errors.password
                      ? "border-red-300 ring-4 ring-red-50"
                      : "border-slate-200 hover:border-slate-300 focus:border-[#3399cc] focus:ring-4 focus:ring-[#3399cc]/10"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={1.5} />
                  ) : (
                    <Eye size={18} strokeWidth={1.5} />
                  )}
                </button>
              </div>

              <div className="flex justify-between items-start mt-2">
                <div className="h-5 ml-4">
                  {formik.touched.password && formik.errors.password && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[11px] text-red-500 flex items-center gap-1.5"
                    >
                      <AlertCircle size={12} />
                      {formik.errors.password}
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex flex-col gap-3">
              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="w-full bg-gradient-to-r from-[#0d3b66] to-[#3399cc] text-white font-medium py-4 px-6 rounded-full shadow-lg shadow-[#3399cc]/20 hover:shadow-[#3399cc]/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm md:text-base mt-2"
              >
                {formik.isSubmitting ? "Signing in..." : "Sign In"}
                {!formik.isSubmitting && <ChevronRight size={18} />}
              </button>

              <button
                type="button"
                disabled={isGuestSigningIn || formik.isSubmitting}
                onClick={handleGuestLogin}
                className="w-full bg-white border-2 border-slate-200 text-slate-600 hover:text-slate-800 font-medium py-3.5 px-6 rounded-full hover:border-slate-300 hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm md:text-base disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isGuestSigningIn ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-[#0d3b66]" />
                    <span>Signing in as Guest...</span>
                  </>
                ) : (
                  <span>Login as Guest</span>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* BOTTOM FOOTER */}
        <div className="mt-16 text-center md:text-left flex flex-col md:flex-row justify-between items-center text-xs text-slate-400 font-medium">
          <p>© {new Date().getFullYear()} Kori Bali Inc.</p>
          <div className="flex gap-4 mt-2 md:mt-0">
            <span className="cursor-pointer hover:text-slate-600">
              Privacy Policy
            </span>
            <span className="cursor-pointer hover:text-slate-600">
              Terms of Use
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
