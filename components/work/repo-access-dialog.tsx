"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

interface RepoAccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
  githubUrl?: string;
  repoAccess?: string;
}

export function RepoAccessDialog({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  githubUrl,
  repoAccess = "request-access",
}: RepoAccessDialogProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const requestAccess = useMutation(api.projects.requestRepoAccess);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;

    setIsSubmitting(true);
    try {
      await requestAccess({
        projectId,
        email: email.trim(),
        name: name.trim(),
        company: company.trim() || undefined,
      });
      setSubmitted(true);
      
      // For public repos, redirect to GitHub after a short delay
      if (repoAccess === "public" && githubUrl) {
        setTimeout(() => {
          window.open(githubUrl, "_blank", "noopener,noreferrer");
          onOpenChange(false);
          setEmail("");
          setName("");
          setCompany("");
          setSubmitted(false);
        }, 1500);
      } else {
        setTimeout(() => {
          onOpenChange(false);
          setEmail("");
          setName("");
          setCompany("");
          setSubmitted(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Error requesting access:", error);
      alert("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {repoAccess === "public" ? "Sign In to View Repository" : "Request Repository Access"}
          </DialogTitle>
          <DialogDescription>
            {repoAccess === "public" ? (
              <>
                Please provide your information to access the repository for <strong>{projectTitle}</strong>.
              </>
            ) : (
              <>
                Request access to view the repository for <strong>{projectTitle}</strong>.
                We&apos;ll review your request and get back to you soon.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold">
              {repoAccess === "public" ? "Redirecting to GitHub..." : "Request Submitted!"}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {repoAccess === "public" ? (
                "You'll be redirected to the repository shortly."
              ) : (
                "We'll review your request and contact you shortly."
              )}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="company" className="text-sm font-medium">
                Company (Optional)
              </label>
              <Input
                id="company"
                type="text"
                placeholder="Your Company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !email.trim() || !name.trim()}>
                {isSubmitting 
                  ? (repoAccess === "public" ? "Redirecting..." : "Submitting...") 
                  : (repoAccess === "public" ? "View Repository" : "Submit Request")
                }
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

