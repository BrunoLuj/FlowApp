import React, { useEffect, useState, useCallback } from 'react';
import * as z from "zod";
import useStore from "../../store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/separator.jsx";
import Input from "../../components/ui/input"; 
import { Button } from "../../components/ui/button"; 
import { BiLoader } from "react-icons/bi";
import { toast } from 'sonner';
import { signUp } from '../../services/authServices.js';

const RegisterSchema = z.object({
  email: z
    .string({ required_error: "Email is required!" })
    .email({ message: "Invalid Email address!" }),
  firstName: z
    .string({ required_error: "Name is required!" })
    .min(3, "Name must be at least 3 characters long!"),
  password: z
    .string({ required_error: "Password is required!" })
    .min(8, "Password must be at least 8 characters!")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter!")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Password must contain at least one special character!"),
});

const SignUp = () => {
  const { user } = useStore((state) => state);
  const { register, handleSubmit, formState: { errors }, setError } = useForm({
    resolver: zodResolver(RegisterSchema),
  });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const onSubmit = useCallback(async (data) => {
    setLoading(true);
    try {
      const { data: res } = await signUp(data);

      if (res?.user) {
        toast.success("Account created successfully. You can now login.");
        navigate("/sign-in");
      }

    } catch (error) {
      const errorMessage = error?.response?.data?.message || error.message;
      setError("server", { message: errorMessage }); // Dodeli grešku stanju
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [navigate, setError]);

  return (
    <div className='flex items-center justify-center w-full min-h-screen py-10'>
      <Card className="w-[400px] bg-white dark:bg-black/20 shadow-md overflow-hidden">
        <div className='p-6 md:-8'>
          <CardHeader className="py-0">
            <CardTitle className="mb-8 text-center dark:text-white">
              Create Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <div className='mb-8 space-y-6'>
                <div className='mb-8 space-y-6 text-center'>Sign With Google</div>
                <Separator />

                <Input
                  disabled={loading}
                  id="firstName"
                  label="Name"
                  name="firstName"
                  type="text"
                  placeholder="Insert your name!"
                  error={errors.firstName?.message}
                  {...register("firstName")}
                  className="text-sm border dark:border-gray-900 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-800 dark:outline-none"
                />

                <Input
                  disabled={loading}
                  id="email"
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="your@example.com"
                  error={errors.email?.message}
                  {...register("email")}
                  className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-800 dark:outline-none"
                />

                <Input
                  disabled={loading}
                  id="password"
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Insert your password!"
                  error={errors.password?.message}
                  {...register("password")}
                  className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-800 dark:outline-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-800"
                disabled={loading}
              >
                {loading ? (
                  <BiLoader className="text-2xl text-white animate-spin" />
                ) : (
                  "Create an account"
                )}
              </Button>
            </form>
          </CardContent>
        </div>
        <CardFooter className="justify-center gap-2">
          <p className='text-sm text-gray-600'>Already have an account?</p>
          <Link
            to="/sign-in"
            className='text-sm font-semibold text-violet-600 hover:underline'
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignUp;
