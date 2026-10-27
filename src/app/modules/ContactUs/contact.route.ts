/* eslint-disable @typescript-eslint/no-explicit-any */
import express from 'express';


import { contactControllers } from './contact.controller';



const router = express.Router();


    
router.post('/send-message',contactControllers.sendMessage)


export const ContactRoutes = router;
