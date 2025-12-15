import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BiLoader } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useStore from "../../store";
import { signIn } from "../../services/authServices.js";
import { useTranslation } from "react-i18next";

const SignIn = () => {
  const { t, i18n } = useTranslation();
  const { user, setCredentials } = useStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const LoginSchema = z.object({
    email: z.string({ required_error: t("Email is required!") }).email({ message: t("Invalid Email address!") }),
    password: z.string({ required_error: t("Password is required!") }).min(1, t("Password is required!")),
  });

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(LoginSchema),
  });

  useEffect(() => {
    if (user) navigate("/overview");
  }, [user, navigate]);

  const onSubmit = useCallback(async (data) => {
    setLoading(true);
    try {
      const { data: res } = await signIn(data);
      if (res?.user) {
        toast.success(res?.message);
        const userInfo = { ...res?.user, token: res.token };
        localStorage.setItem("user", JSON.stringify(userInfo));
        setCredentials(userInfo);
        navigate("/overview");
      }
    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message;
      setError("server", { message: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [navigate, setCredentials, setError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 animate-fadeIn">
        <h1 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-8">Sign In</h1>

        <button className="w-full flex items-center justify-center bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md mb-6 transition">
          Sign in with Google
        </button>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="relative">
            <input
              type="email"
              placeholder=" "
              {...register("email")}
              disabled={loading}
              className="peer w-full border-b-2 border-gray-300 dark:border-gray-700 bg-transparent py-2 text-gray-900 dark:text-gray-200 placeholder-transparent focus:border-violet-600 focus:outline-none transition"
            />
            <label className="absolute left-0 top-2 text-gray-500 text-sm peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-violet-600 peer-focus:text-sm transition">
              Email
            </label>
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div>

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder=" "
              {...register("password")}
              disabled={loading}
              className="peer w-full border-b-2 border-gray-300 dark:border-gray-700 bg-transparent py-2 text-gray-900 dark:text-gray-200 placeholder-transparent focus:border-violet-600 focus:outline-none transition"
            />
            <label className="absolute left-0 top-2 text-gray-500 text-sm peer-placeholder-shown:top-2.5 peer-placeholder-shown:text-gray-400 peer-placeholder-shown:text-base peer-focus:-top-3 peer-focus:text-violet-600 peer-focus:text-sm transition">
              Password
            </label>
            <button
              type="button"
              className="absolute right-0 top-2 text-gray-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold py-2 px-4 rounded-xl transition flex justify-center items-center"
          >
            {loading ? <BiLoader className="animate-spin text-2xl" /> : "Sign In"}
          </button>
        </form>

        <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
          Don't have an account?{" "}
          <Link to="/sign-up" className="text-violet-600 hover:underline font-semibold">Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default SignIn;
