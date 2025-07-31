import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import logo from "/logo.svg";
import { FaDiscord, FaTwitter, FaGithub, FaTelegramPlane } from "react-icons/fa";

const footerLinks = [
  { href: "#features", label: "Features" },
  { href: "#about", label: "About" },
  { href: "#community", label: "Community" },
];

const socialLinks = [
  { href: "https://x.com/xorionchain?s=21", label: "X", icon: FaTwitter },
  { href: "https://discord.gg/ucc278yJZt", label: "Discord", icon: FaDiscord },
  { href: "https://t.me/Xorion_Chain", label: "Telegram", icon: FaTelegramPlane },
  { href: https://github.com/XORIONCHAIN", label: "GitHub", icon: FaGithub },
];

export default function Footer() {
  const navigate = useNavigate();

  return (
    <footer className="glass-card border-t border-border py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-10">
          {/* TOP SECTION */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <motion.div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate("/")}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <img src={logo} alt="company-logo" className="h-8 w-auto md:h-7" />
              <span className="text-xl font-semibold text-white">XORION</span>
            </motion.div>

            <nav className="flex flex-wrap justify-center gap-6 md:gap-8">
              {footerLinks.map((link, index) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  className="text-muted-foreground hover:text-primary transition-colors text-sm md:text-base"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {link.label}
                </motion.a>
              ))}
            </nav>

            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={{ scale: 1.1, y: -2 }}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                  className="w-10 h-10 glass-card rounded-lg flex items-center justify-center transition-colors"
                >
                  <social.icon className="text-primary" size={20} />
                </motion.a>
              ))}
            </div>
          </div>

          {/* BOTTOM COPYRIGHT */}
          <motion.p
            className="text-center text-muted-foreground text-sm pt-4 border-t border-border"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            © {new Date().getFullYear()} XORION. All rights reserved.
          </motion.p>
        </div>
      </div>
    </footer>
  );
}