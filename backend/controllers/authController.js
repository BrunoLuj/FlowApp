export const signupUser = async(req, res) =>{
    try{

    }catch(error){
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        })
    }
};

export const signinUser = async(req, res) =>{
    try{

    }catch(error){
        console.log(error);
        res.status(500).json({
            status: "Failed",
            message: error.message,
        })
    }
};