export type Section = { h: string; p?: string[]; ul?: string[] };
export type InfoPage = { title: string; intro: string; draft?: boolean; sections: Section[] };

export const INFO: Record<string, InfoPage> = {
  about: {
    title: 'About KazaVibe',
    intro: 'KazaVibe is a community app for people in Kazaure, Jigawa State. Share short videos, follow creators, make friends, chat privately and, if you choose, meet someone special.',
    sections: [
      { h: 'Why we built it', p: ['Big social networks are built for everyone, which means they are built for no one in particular. KazaVibe starts small, with one community, so you see people you might actually know or want to meet.'] },
      { h: 'What we believe', ul: ['Your community comes first. We begin in Kazaure and grow town by town.', 'You are in control of who finds you, follows you and contacts you.', 'Safety is not a paid feature. Blocking, reporting and private profiles are free for everyone.', 'Dating is optional. Following, liking or commenting is never treated as romantic interest.'] },
      { h: 'What you can do', ul: ['Share photos and clips of up to 30 seconds.', 'Discover people by interest and by area.', 'Chat privately, with message requests so strangers cannot flood your inbox.', 'Opt in to Connect to meet people for friendship, dating or marriage.'] },
    ],
  },
  safety: {
    title: 'Safety Centre',
    intro: 'Your safety matters more than anything else on KazaVibe. Here is what we do, and what you can do.',
    sections: [
      { h: 'Tools that are always free', ul: ['Block anyone. They can no longer find, follow or message you.', 'Report profiles, posts, comments and messages. Our team reviews every report.', 'Make your profile private so you approve each follower.', 'Pause Nearby to hide yourself from area-based discovery.', 'Message requests keep messages from strangers out of your inbox until you accept.'] },
      { h: 'Your location', p: ['We never ask for your GPS and never show an exact location. You choose a neighbourhood or area, and that is all other members see.'] },
      { h: 'Verification badges', p: ['A verified badge means KazaVibe\u2019s configured checks were completed. It does not guarantee a person\u2019s honesty, safety or identity documents, or that everything on their profile is true.'] },
      { h: 'Meeting someone in person', ul: ['Meet in a busy public place the first few times.', 'Tell a trusted friend or family member where you are going and who you are meeting.', 'Arrange your own transport.', 'Never send money or share banking details with someone you have not met. Be cautious of anyone who asks.', 'If something feels wrong, leave. You do not owe anyone an explanation.'] },
      { h: 'Under 18', p: ['KazaVibe is for adults aged 18 and over. If you believe a member is under 18, report their profile. Accounts suspected of belonging to minors are restricted while we review them.'] },
      { h: 'In an emergency', p: ['If you or someone else is in immediate danger, contact the police or emergency services (112 in Nigeria) first, then report the account to us.'] },
    ],
  },
  guidelines: {
    title: 'Community Guidelines',
    intro: 'These rules keep KazaVibe welcoming. Breaking them can lead to removed content, restrictions or a suspended account.',
    sections: [
      { h: 'Be real', ul: ['You must be 18 or over.', 'Do not pretend to be someone else, and do not run fake or duplicate accounts.'] },
      { h: 'Be respectful', ul: ['No harassment, bullying, threats or stalking.', 'No hate or abuse aimed at people because of who they are.', 'Do not keep messaging someone who has said no or blocked you.'] },
      { h: 'Keep it safe and legal', ul: ['No sexual content involving non-consenting people, and no sharing intimate images without consent.', 'No scams, spam, fake giveaways or requests for money.', 'No dangerous or illegal content.', 'Only post content you own or have permission to share. Respect copyright.'] },
      { h: 'What happens when rules are broken', p: ['We take proportionate action: no action, a warning, removing content, restricting features, suspending or ending an account. Serious cases may be reported to the authorities.'] },
      { h: 'Disagree with a decision?', p: ['You can ask us to review it. Use the Help Centre to get in touch.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    draft: true,
    intro: 'This explains what information KazaVibe collects, why, and the choices you have.',
    sections: [
      { h: 'What we collect', ul: ['Account details: name, email or phone number, and a password (stored only as a secure hash).', 'Date of birth, used to confirm you are 18 or over. It is never shown on your profile.', 'Profile details you add: photo, bio, interests, gender (optional), area and what you are looking for (optional).', 'Only if you choose to verify: a selfie and a code. An administrator reviews it and it is deleted as soon as they decide. Unreviewed selfies are deleted after 14 days.', 'Your phone number, only if you add one for phone-code sign-in.', 'Your device\u2019s push subscription, only if you turn on notifications.', 'Content you post, comments, likes, saves, follows and blocks.', 'Messages you send and receive.', 'Reports you submit and safety records about reports.'] },
      { h: 'What we do not collect', ul: ['Your GPS location or location history.', 'Payment card details. If payments are added we will use a payment provider and will not store card numbers.'] },
      { h: 'How we use it', ul: ['To run KazaVibe: show your profile and content to the people you allow.', 'To keep the community safe: review reports, prevent spam and fake accounts.', 'To send you notices about your account and activity.'] },
      { h: 'Who can see what', p: ['Private profiles and followers-only posts are protected on our servers. Likes on Connect stay private until both people like each other. Moderators cannot read private messages.'] },
      { h: 'Sharing', p: ['We do not sell your personal information. We use service providers (for example hosting and, in future, SMS or payments) who process data for us under our instructions.'] },
      { h: 'Keeping and deleting data', p: ['You can delete your account in Settings. This removes your profile, posts, messages and uploaded media. We may keep limited records, such as moderation and audit logs, where needed for safety or to meet legal obligations.'] },
      { h: 'Your rights', p: ['Under applicable Nigerian data-protection law you may have rights to access, correct and delete your data and to object to some processing. Contact us through the Help Centre to make a request.'] },
      { h: 'Security', p: ['We use secure password storage, private media storage and access checks on every request. No system is perfectly secure, so please use a strong, unique password.'] },
      { h: 'Children', p: ['KazaVibe is not for anyone under 18. If we learn a member is under 18 we will restrict the account.'] },
    ],
  },
  terms: {
    title: 'Terms of Service',
    draft: true,
    intro: 'By creating an account or using KazaVibe you agree to these terms.',
    sections: [
      { h: 'Who can use KazaVibe', p: ['You must be at least 18 years old and able to form a binding agreement. You are responsible for your account and for keeping your password secure.'] },
      { h: 'Your content', p: ['You own the content you post. You give KazaVibe permission to host, display and deliver it to the audience you choose so the service can work. You promise you have the right to post it and that it follows our Community Guidelines.'] },
      { h: 'What you may not do', ul: ['Break the law or our Community Guidelines.', 'Impersonate others, scam, spam or harass people.', 'Try to break, scrape or overload the service, or access other people\u2019s accounts.'] },
      { h: 'Moderation', p: ['We may remove content, restrict features or suspend accounts that break these terms or put people at risk. Where appropriate we will tell you why and let you appeal.'] },
      { h: 'Paid features', p: ['Some features are offered as an optional paid plan (KazaVibe Plus). Safety tools such as blocking, reporting and private profiles always remain free. Plus is a one-time payment for the period you choose, shown in naira before you pay, and it does not renew automatically. Payments are processed by Paystack and KazaVibe does not store your card details. Contact us through the Help Centre about payment problems.'] },
      { h: 'Meeting people', p: ['KazaVibe helps people connect but does not check every member and cannot guarantee anyone\u2019s identity or intentions. You are responsible for your own safety when meeting others. Read the Safety Centre.'] },
      { h: 'Ending your account', p: ['You can delete your account at any time in Settings. We may suspend or end accounts that break these terms.'] },
      { h: 'Our responsibility', p: ['We work to keep KazaVibe running and safe, but the service is provided as is and may sometimes be unavailable. To the extent the law allows, we are not responsible for losses caused by other members or by events outside our control.'] },
      { h: 'Governing law and changes', p: ['These terms are governed by the laws of the Federal Republic of Nigeria. We may update them, and will tell you about important changes.'] },
    ],
  },
  help: {
    title: 'Help Centre',
    intro: 'Quick answers to common questions.',
    sections: [
      { h: 'How do I make my profile private?', p: ['Go to Settings, set Profile visibility to Private and save. New followers will need your approval, and you can approve requests in Settings.'] },
      { h: 'How do I block or report someone?', p: ['Open their profile (or a chat) and tap Block or Report. You can unblock people in Settings.'] },
      { h: 'How do I hide from Nearby?', p: ['Open Nearby and switch off Show me in Nearby, or do it in Settings.'] },
      { h: 'How does Connect work?', p: ['Connect is optional. Turn it on, choose what you are looking for, and like people you are interested in. Likes are private until both of you like each other, then a chat opens.'] },
      { h: 'How do I delete my account?', p: ['Settings, then Delete account at the bottom. This permanently removes your profile, posts, messages and uploaded media.'] },
      { h: 'I forgot my password', p: ['On the login screen tap Forgot password. We email a 6-digit code to the email address on your account. Enter it with a new password. The code expires after 10 minutes.'] },
    ],
  },
};
