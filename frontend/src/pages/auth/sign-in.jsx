import React, { useEffect, useState } from 'react';
import * as z from "zod";
import useStore from "../../store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/separator.jsx";
import Input from "../../components/ui/input"; 
import { Button } from "../../components/ui/button"; 
import { BiLoader } from "react-icons/bi"
import { toast } from 'sonner';

const LoginShema = z.object({
  email: z
    .string({ required_error : "Email is required!"})
    .email({ message : "Invalid Email address !"}),
  password: z
    .string({ required_error: "Password is required!"})
    .min(1, "Password is required!")
});

const SignIn = () => {
  const {user} = useStore((state) => state);
  const {register, handleSubmit, formState: {errors}} = useForm({
    resolver:  zodResolver(LoginShema),
  });

  const navigate = useNavigate();
  const[loading, setLoading] = useState();

  useEffect(()=>{
    user && navigate("/");
  }, [user]);

  const onSubmit = async(data) =>{
    try {
      console.log(data);
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  return(
    <div className='flex items-center justify-center w-full min-h-screen py-10'>
      <Card className="w-[400px] bg-white dark:bg-black/20 shadow-md overflow-hidden">
        <div className='p-6 md:-8'>
          <CardHeader className="py-0">
            <CardTitle className="mb-8 text-center dark:text-white">
              Sign In
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit = {handleSubmit(onSubmit)} className='space-y-4'>
              <div className='mb-8 space-y-6'>
                {/* <SocialAuth isLoading={loading} setLoading={setLoading} /> */}
                <div className='mb-8 space-y-6 text-center'>Sign With Google</div>
                <Separator/>

                <Input
                  disabled = {loading}
                  id="email"
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="your@example.com"
                  error={errors?.email?.message}
                  {...register("email")}
                  className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark: text-gray-400 dark:outline-none"
                />

                <Input
                  disabled = {loading}
                  id="password"
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="Insert your password!"
                  error={errors?.password?.message}
                  {...register("password")}
                  className="text-sm border dark:border-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark: text-gray-400 dark:outline-none"
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
                    "Sign in"
                  )}
              </Button>

            </form>
          </CardContent>
        </div>
        <CardFooter className="justify-center gap-2">
          <p className='text-sm text-gray-600'>Already have an account?</p>
          <Link
            to="/sign-up"
            className='text-sm font-semibold text-violet-600 hover:underline'
          >
            Sign up
          </Link>
        </CardFooter>
      </Card>
    </div>
  ); 
};

export default SignIn;
