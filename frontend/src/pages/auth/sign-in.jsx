import React, { useState, useCallback, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { BiLoader } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import useStore from "../../store";
import { signIn } from "../../services/authServices.js";
import { useTranslation } from "react-i18next";
import { RiBlazeLine } from "react-icons/ri";

const SignIn = () => {
  const { t } = useTranslation();
  const { user, setCredentials } = useStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const LoginSchema = z.object({
    email: z.string({ required_error: "Korisničko ime je obavezno" }).min(2, "Unesite korisničko ime ili e-mail"),
    password: z.string({ required_error: t("Password is required!") }).min(1, t("Password is required!")),
  });

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(LoginSchema),
  });

  useEffect(() => {
    if (user) navigate(user.loyalty_portal_only ? "/my-loyalty" : "/overview");
  }, [user, navigate]);

  const onSubmit = useCallback(async (data) => {
    setLoading(true);
    try {
      const identifier=data.email.includes("@")?data.email:`${data.email}@flow.local`;
      const { data: res } = await signIn({...data,email:identifier});
      if (res?.user) {
        toast.success(res?.message);
        const userInfo = { ...res?.user, token: res.token };
        localStorage.setItem("user", JSON.stringify(userInfo));
        setCredentials(userInfo);
        navigate(userInfo.loyalty_portal_only ? "/my-loyalty" : "/overview");
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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 p-4"><div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-500/15 blur-3xl"/><div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl"/>
      <div className="relative w-full max-w-md rounded-[28px] border border-white/10 bg-white p-7 shadow-2xl sm:p-9">
        <div className="mb-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500 text-3xl text-white shadow-lg shadow-orange-500/30"><RiBlazeLine/></span><h1 className="mt-5 text-3xl font-black text-slate-900">Prijava u FlowApp</h1><p className="mt-2 text-sm text-slate-500">Servis, mjeriteljstvo i terenski rad na jednom mjestu.</p></div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700">Korisničko ime ili e-mail</label><div className="relative">
            <input
              type="text"
              placeholder="Unesite korisničko ime"
              {...register("email")}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-900"
            />
            {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email.message}</p>}
          </div></div>

          <div><label className="mb-2 block text-sm font-bold text-slate-700">Lozinka</label><div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Unesite lozinku"
              {...register("password")}
              disabled={loading}
              className="w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 pr-12 text-slate-900"
            />
            <button
              type="button"
              className="absolute right-4 top-4 text-slate-500"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
            </button>
            {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password.message}</p>}
          </div></div>

          <button
            type="submit"
            disabled={loading}
            className="flex min-h-12 w-full items-center justify-center rounded-xl bg-orange-500 px-4 font-black text-white shadow-lg shadow-orange-200 hover:bg-orange-600"
          >
            {loading ? <BiLoader className="animate-spin text-2xl" /> : "Prijavi se"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Korisničke račune otvara administrator sustava.
        </p>
      </div>
    </div>
  );
};

export default SignIn;
