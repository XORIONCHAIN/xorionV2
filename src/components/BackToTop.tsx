"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const BackToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            // Show button after scrolling 15% of the viewport height
            const scrollThreshold = window.innerHeight * 0.15;
            if (window.scrollY > scrollThreshold) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener("scroll", toggleVisibility);
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    };

    return isVisible ? (
        <Button
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 rounded-full w-12 h-12 p-0 shadow-lg text-white"
            variant="outline"
        >
            <ArrowUp className="w-5 h-5" />
        </Button>
    ) : null;
};

export default BackToTop;