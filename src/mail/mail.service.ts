import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  // 🔐 Signup / Email Verification OTP
  async sendSignupOtpMail(to: string, otp: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2>Verify Your Email</h2>
        <p>Hello,</p>
        <p>Thank you for signing up! Use the OTP below to verify your email:</p>
        <h1 style="color:#2d89ef;">${otp}</h1>
        <p>This code will expire in <b>5 minutes</b>.</p>
        <hr />
        <p style="font-size:12px; color:#666;">
          If you didn’t create this account, you can safely ignore this email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `Art Behind Bars <${process.env.MAIL_USER}>`,
      to,
      subject: 'Verify Your Email Address',
      html,
    });
  }

  // 🔑 Forgot Password OTP
  async sendForgotPasswordOtpMail(to: string, otp: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; padding:20px;">
        <h2>Password Reset Request</h2>
        <p>Hello,</p>
        <p>You requested to reset your password. Use the OTP below:</p>
        <h1 style="color:#e63946;">${otp}</h1>
        <p>This code will expire in <b>5 minutes</b>.</p>
        <hr />
        <p style="font-size:12px; color:#666;">
          If you didn’t request a password reset, please ignore this email.
        </p>
      </div>
    `;

    await this.transporter.sendMail({
      from: `Art Behind Bars <${process.env.MAIL_USER}>`,
      to,
      subject: 'Reset Your Password',
      html,
    });
  }
  async sendAdminReplyEmail(to: string, name: string, reply: string) {
    await this.transporter.sendMail({
      from: `"Support Team" <${process.env.MAIL_USER}>`,
      to,
      subject: 'Reply to Your Contact Request',
      html: `
        <div>
          <h3>Hello ${name},</h3>
          <p>We have replied to your message:</p>
          <div style="padding:10px;background:#f4f4f4;border-radius:6px;">
            ${reply}
          </div>
          <br/>
          <p>Best Regards,<br/>Support Team</p>
        </div>
      `,
    });
  }

  // 🔄 Email Change – Verify OLD Email
  async sendOldEmailVerifyOtp(to: string, otp: string) {
    const html = `
    <div style="font-family: Arial, sans-serif; padding:20px;">
      <h2>Email Change Request</h2>
      <p>Hello,</p>
      <p>You requested to change your email address.</p>

      <p>Please verify your CURRENT email using this OTP:</p>

      <h1 style="color:#2d89ef;">${otp}</h1>

      <p>This code expires in <b>10 minutes</b>.</p>

      <hr/>
      <p style="font-size:12px;color:#666;">
        If you didn’t request this, secure your account immediately.
      </p>
    </div>
  `;

    await this.transporter.sendMail({
      from: `Art Behind Bars <${process.env.MAIL_USER}>`,
      to,
      subject: 'Verify Your Current Email',
      html,
    });
  }

  // 🔄 Email Change – Verify NEW Email
  async sendNewEmailVerifyOtp(to: string, otp: string) {
    const html = `
    <div style="font-family: Arial, sans-serif; padding:20px;">
      <h2>Confirm Your New Email</h2>

      <p>Hello,</p>

      <p>Please confirm your NEW email address using this OTP:</p>

      <h1 style="color:#e63946;">${otp}</h1>

      <p>This code expires in <b>10 minutes</b>.</p>

      <hr/>
      <p style="font-size:12px;color:#666;">
        If this wasn’t you, ignore this email.
      </p>
    </div>
  `;

    await this.transporter.sendMail({
      from: `Art Behind Bars <${process.env.MAIL_USER}>`,
      to,
      subject: 'Verify Your New Email',
      html,
    });
  }
}
