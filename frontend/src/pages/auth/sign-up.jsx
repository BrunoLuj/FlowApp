import React, { useEffect, useState } from 'react';
import * as z from "zod";
import useStore from "../../store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

const RegisterShema = z.object({
  email: z
    .string({ required_error : "Email is required!"})
    .email({ message : "Invalid Email address !"}),
  firstName: z.string({ required_error: "Name i required!"}),
  password: z
    .string({ required_error: "Password is required!"})
    .min(1, "Password is required!")
});

const SignUp = () => {
  const {user} = useStore((state) => state);
  const {register, handleSubmit, formState: {errors}} = useForm({
    resolver:  zodResolver(RegisterShema),
  });

  const navigate = useNavigate();
  const[loading, setLoading] = useState();

  useEffect(()=>{
    user && navigate("/");
  }, [user]);

  const onSubmit = async(data) =>{
    console.log(data);
  };

  return(
    <div className='flex items-center justify-center w-full min-h-screen py-10'>
      <Card className="w-[400px] bg-white dark:bg-black/20 shadow-md overflow-hidden">
        <div className='p-6 md:-8'>
          <CardHeader className="py-0">
            <CardTitle className="mb-8 text-center dark:text-white">
              Create Account
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <form onSubmit = {handleSubmit(onSubmit)} className='space-y-4'>
              <div className='mb-8 space-y-6'>
                {/* <SocialAuth isLoading={loading} setLoading={setLoading} /> */}
              </div>
            </form>
          </CardContent>
        </div>
      </Card>
    </div>
  ); 
};

export default SignUp;
