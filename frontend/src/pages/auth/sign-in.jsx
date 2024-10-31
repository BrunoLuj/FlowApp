import React, { useEffect, useState, useCallback } from 'react';
import * as z from "zod";
import useStore from "../../store";
import { useTranslation } from 'react-i18next';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/separator.jsx";
import Input from "../../components/ui/input"; 
import { Button } from "../../components/ui/button"; 
import { BiLoader } from "react-icons/bi";
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { toast } from 'sonner';
import { signIn } from '../../services/authServices.js';
import i18n from 'i18next';

const SignIn = () => {
  const { t, i18n } = useTranslation();
  const { user, setCredentials } = useStore((state) => state);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(localStorage.getItem("language") || "en");

  const LoginSchema = z.object({
    email: z.string({ required_error: t("Email is required!") }).email({ message: t("Invalid Email address!") }),
    password: z.string({ required_error: t("Password is required!") }).min(1, t("Password is required!")),
  });

  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(LoginSchema),
  });

  useEffect(() => {
    if (user) {
      navigate("/overview");
    }
  }, [user, navigate]);

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    i18n.changeLanguage(newLang).then(() => {
      localStorage.setItem("language", newLang);
      setSelectedLanguage(newLang); // This will trigger a re-render
    });
  };

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
    <div className='flex items-center justify-center w-full min-h-screen py-10'>
      <Card className="w-[400px] bg-white dark:bg-black/20 shadow-md overflow-hidden">
        <div className='p-6 md:-8'>
          <CardHeader className="py-0">
            <CardTitle className="mb-8 text-center dark:text-white">{t("Sign In")}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <div className='mb-8 space-y-6'>
                <div className='mb-8 space-y-6 text-center'>{t("googleSignIn")}</div>
                <Separator />

                <Input
                  disabled={loading}
                  id="email"
                  label={t("email")}
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  error={errors.email?.message}
                  {...register("email")}
                  className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-800 dark:outline-none"
                />

                <div className='relative'>
                  <Input
                    disabled={loading}
                    id="password"
                    label={t("password")}
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t("passwordPlaceholder")}
                    error={errors.password?.message}
                    {...register("password")}
                    className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-800 dark:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-3/4 transform -translate-y-1/2 text-gray-500"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <AiOutlineEyeInvisible /> : <AiOutlineEye />}
                  </button>
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700">{t("language")}</label>
                  <select
                    id="language"
                    value={selectedLanguage}
                    onChange={handleLanguageChange} // Promjena jezika odmah
                    className="mt-2 pt-1 pb-1 text-sm border block w-full dark:bg-transparent dark:border-gray-800  rounded-md shadow-sm focus:ring-indigo-500 focus:border-gray-800 dark:outline-none"
                  >
                    <option value="en">{t("english")}</option>
                    <option value="hr">{t("croatian")}</option>
                  </select>
                  {errors.language && <p className="text-red-600 text-sm">{errors.language.message}</p>}
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-800"
                disabled={loading}
              >
                {loading ? <BiLoader className="text-2xl text-white animate-spin" /> : t("signIn")}
              </Button>
            </form>
          </CardContent>
        </div>
        <CardFooter className="justify-center gap-2">
          <p className='text-sm text-gray-600'>{t("dontHaveAccount")}!</p>
          <Link to="/sign-up" className='text-sm font-semibold text-violet-600 hover:underline'>
            {t("createAccount")}
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignIn;
