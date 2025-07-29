"use client";


import { useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";


const headline = `Your blockchain exploration deserves better. Navigate transactions, blocks, and addresses like never before. We've seen the complexity.`;
const description = ``;
const words = headline.split(" ");
const lettersPerWord = words.map(word => word.split(""));
const totalLetters = words.reduce((acc, word) => acc + word.length, 0) + (words.length - 1); // spaces count as 1 letter

export default function Introduction() {
  const scrollTargetRef = useRef(null);
  const [currentLetter, setCurrentLetter] = useState(0);

  const { scrollYProgress } = useScroll({
    target: scrollTargetRef,
    offset: ["start end", "end end"],
  });

  const letterIndex = useTransform(scrollYProgress, [0, 1], [0, totalLetters]);

  useEffect(() => {
    const unsubscribe = letterIndex.on("change", (latest) => {
      setCurrentLetter(Math.floor(latest));
    });
    return () => unsubscribe();
  }, [letterIndex]);

  let letterCount = 0;

  return (
    <section className="relative py-12 md:py-16 glass-card">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-center min-h-[40vh] md:min-h-[30vh]">
          <div className="w-full max-w-4xl mx-auto text-center">
            {/* Tag */}
            <div className="mb-6">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 text-center">About</h2>
            </div>
            {/* Headline + Animated Text */}
            <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6 break-words whitespace-normal gradient-blue-purple bg-clip-text text-transparent">
              <span className="block text-5xl md:text-7xl font-extrabold mb-4 whitespace-normal break-words">
                {words.map((word, wIdx) => {
                  const wordLetters = lettersPerWord[wIdx];
                  const wordStart = letterCount;
                  letterCount += wordLetters.length;
                  const wordEnd = letterCount;
                  // Add a space after each word except the last
                  const isLast = wIdx === words.length - 1;
                  // The space after the word is also animated as a letter
                  const spaceIdx = letterCount;
                  letterCount += 1;
                  return (
                    <span key={wIdx} className="inline-block align-middle mr-2">
                      {wordLetters.map((letter, lIdx) => {
                        const globalIdx = wordStart + lIdx;
                        return (
                          <span
                            key={lIdx}
                            className={twMerge(
                              "transition duration-300 text-muted-foreground/30",
                              globalIdx < currentLetter && "text-primary"
                            )}
                          >
                            {letter}
                          </span>
                        );
                      })}
                      {!isLast && (
                        <span
                          className={twMerge(
                            "transition duration-300 text-muted-foreground/30",
                            spaceIdx < currentLetter && "text-primary"
                          )}
                        >
                          {"\u00A0"}
                        </span>
                      )}
                    </span>
                  );
                })}
              </span>
              <span className="block text-primary text-3xl md:text-4xl mt-6 font-extrabold">
                That's why we built XORION.
              </span>
            </h1>
            <p className="text-lg md:text-2xl text-muted-foreground max-w-2xl mx-auto mt-6">
              {description}
            </p>
          </div>
        </div>
        <div ref={scrollTargetRef} className="h-[10vh] md:h-[6vh]" />
      </div>
    </section>
  );
}
