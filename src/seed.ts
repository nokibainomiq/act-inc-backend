import mongoose from 'mongoose';
import config from './app/config';
import { User } from './app/modules/User/user.model';
import { Team } from './app/modules/Team/team.model';
import { Training, Topic } from './app/modules/Training/training.model';
import { Module } from './app/modules/Module/module.model';
import { UserProgress } from './app/modules/UserProgress/userProgress.model';
import FAQModel from './app/modules/FAQ/faq.model';
import PrivacyPolicy from './app/modules/PrivacyPolicy/privacyPolicy.model';

const seedData = async () => {
  try {
    console.log('🌱 Connecting to Database...');
    await mongoose.connect(config.database_url as string);
    console.log('✅ Connected to Database successfully.');

    // ── 1. Clear Database ──
    console.log('🧹 Clearing old data...');
    await User.deleteMany({});
    await Team.deleteMany({});
    await Training.deleteMany({});
    await Topic.deleteMany({});
    await Module.deleteMany({});
    await UserProgress.deleteMany({});
    await FAQModel.deleteMany({});
    await PrivacyPolicy.deleteMany({});
    console.log('✅ Old data cleared.');

    // ── 2. Create Admin ──
    const admin = await User.create({
      firstName: 'Super',
      lastName: 'Admin',
      email: 'admin@actinc.com',
      password: 'password123',
      role: 'superAdmin',
      authType: 'email',
    });
    console.log('✅ Admin created.');

    // ── 3. Create Company ──
    const company = await User.create({
      firstName: 'Acme',
      lastName: 'Corporation',
      email: 'company@acme.com',
      password: 'password123',
      role: 'company',
      authType: 'email',
      slug: 'acme-corp',
    });
    console.log('✅ Company created.');

    // ── 4. Create Teams ──
    const salesTeam = await Team.create({
      name: 'Sales Team',
      companyId: company._id,
      passcode: '1234'
    });

    const supportTeam = await Team.create({
      name: 'Support Team',
      companyId: company._id,
      passcode: '5678'
    });
    console.log('✅ Teams created.');

    // ── 5. Create Employees (Users) ──
    await User.create([
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@acme.com',
        role: 'user',
        companyId: company._id,
        teamId: salesTeam._id,
        authType: 'email',
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@acme.com',
        role: 'user',
        companyId: company._id,
        teamId: supportTeam._id,
        authType: 'email',
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        employeeId: 'EMP001',
        role: 'user',
        companyId: company._id,
        teamId: supportTeam._id,
        authType: 'employeeId',
      },
    ]);
    console.log('✅ Employees created.');

    // ── 6. Create Training (Auth Type: Passcode) ──
    const training = await Training.create({
      title: 'Customer Service Excellence',
      description: 'Learn how to handle difficult customer situations effectively.',
      thumbnailImage: 'https://images.unsplash.com/photo-1552581234-26160f608093?w=800&q=80',
      companyId: company._id,
      authType: 'passcode',
      passcode: '1234', // Secret passcode for this training
      status: 'published',
      createdBy: admin._id,
      qrCodeUrl: 'https://example.com/qr-placeholder.png', // We can skip actual generation in seed
    });
    console.log('✅ Training created.');

    // ── 7. Create Topics ──
    const topic1 = await Topic.create({
      title: 'Basic Communication Skills',
      description: 'Foundations of good communication',
      trainingId: training._id,
      order: 1,
    });

    const topic2 = await Topic.create({
      title: 'Handling Aggressive Customers',
      description: 'De-escalation techniques',
      trainingId: training._id,
      order: 2,
    });
    console.log('✅ Topics created.');

    // ── 8. Create Modules ──
    const module1 = await Module.create({
      title: 'Comprehensive Communication Training',
      description: 'Covers all interactive types of learning',
      topicId: topic1._id,
      companyId: company._id,
      status: 'published',
      createdBy: admin._id,
      questions: [
        {
          id: 'q1',
          type: 'Information',
          content: 'Welcome to this comprehensive module. Please read the instructions carefully.',
        },
        {
          id: 'q2',
          type: 'Video',
          content: 'Active Listening Basics',
          videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
        },
        {
          id: 'q3',
          type: 'MCQ',
          content: 'What is the most important part of communication?',
          options: ['Talking loudly', 'Active Listening', 'Interrupting', 'Ignoring'],
          correctAnswer: 'Active Listening',
        },
        {
          id: 'q4',
          type: 'Swipe',
          content: 'Swipe right for correct behavior, left for incorrect behavior: Yelling at a customer.',
          leftLabel: 'Incorrect',
          rightLabel: 'Correct',
          correctDirection: 'left',
        },
        {
          id: 'q5',
          type: 'Ordering',
          content: 'Order the steps of resolving a customer complaint:',
          items: ['Listen actively', 'Apologize', 'Solve the problem', 'Thank the customer'],
        },
        {
          id: 'q6',
          type: 'Chat Scenario',
          content: 'Respond to this angry chat message.',
          messages: [
            { sender: 'Customer', text: 'My order is 3 days late!' },
          ],
          options: ['It is not our fault.', 'I apologize for the delay, let me check.'],
          correctAnswer: 'I apologize for the delay, let me check.',
        },
        {
          id: 'q7',
          type: 'Free Input',
          content: 'Describe a time you handled a difficult customer.',
        },
        {
          id: 'q8',
          type: 'Rating',
          content: 'On a scale of 1 to 5, how confident are you?',
          scale: 5,
        },
        {
          id: 'q9',
          type: 'Simulated Call',
          content: 'Incoming call from a frustrated user',
          callerName: 'Alex Rivera',
          callerPhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80',
          postCallVideoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
          postCallMessage: 'Great job maintaining your composure during that difficult call!',
        },
      ],
    });

    console.log('✅ Modules created.');

    // Link modules to topics
    topic1.moduleIds = [module1._id as any];
    await topic1.save();

    // Since we put all questions in module1, we can leave topic2 empty or remove it. Let's just leave it empty.
    topic2.moduleIds = [];
    await topic2.save();

    // ── 9. Create FAQ ──
    await FAQModel.insertMany([
      { Ques: 'What is this platform?', Answere: 'This is an interactive training portal.' },
      { Ques: 'How do I login?', Answere: 'You can login by scanning the QR code and providing your credentials.' },
    ]);
    console.log('✅ FAQ created.');

    // ── 10. Create Privacy Policy ──
    await PrivacyPolicy.create({
      privacyPolicy: '<h1>Privacy Policy</h1><p>We respect your privacy and protect your data securely.</p>',
    });
    console.log('✅ Privacy Policy created.');

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
