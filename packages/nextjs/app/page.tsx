"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Address } from "@scaffold-ui/components";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

// Admin address
const ADMIN = "0x11ce532845cE0eAcdA41f72FDc1C88c335981442";

// Format CLAWD amounts with commas for readability
const formatClawdAmount = (amount: bigint): string => {
  return Number(formatEther(amount)).toLocaleString();
};

interface Idea {
  id: bigint;
  creator: string;
  content: string;
  totalStaked: bigint;
  stakerCount: bigint;
  isBuilt: boolean;
  isBurned: boolean;
  payoutPool: bigint;
  createdAt: bigint;
}

const Home: NextPage = () => {
  const { address: connectedAddress } = useAccount();
  const isAdmin = connectedAddress?.toLowerCase() === ADMIN.toLowerCase();

  // Get deployed $CLAWDlabs contract address
  const { data: ideaLabsInfo } = useDeployedContractInfo("IdeaLabs");
  const ideaLabsAddress = ideaLabsInfo?.address;

  // Read costs from contract (never hardcode!)
  const { data: submitCost } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "SUBMIT_COST",
  });

  const { data: stakeCost } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "STAKE_COST",
  });

  // State
  const [ideaContent, setIdeaContent] = useState("");
  const [payoutAmounts, setPayoutAmounts] = useState<Record<number, string>>({});

  // Warning banner dismissed state (localStorage)
  const [warningDismissed, setWarningDismissed] = useState(true);

  useEffect(() => {
    const dismissed = localStorage.getItem("idea-labs-warning-dismissed");
    setWarningDismissed(dismissed === "true");
  }, []);

  const dismissWarning = () => {
    localStorage.setItem("idea-labs-warning-dismissed", "true");
    setWarningDismissed(true);
  };

  // Loading states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApprovingSubmit, setIsApprovingSubmit] = useState(false);
  const [stakingIdeaId, setStakingIdeaId] = useState<number | null>(null);
  const [approvingStakeIdeaId, setApprovingStakeIdeaId] = useState<number | null>(null);
  const [markingBuiltId, setMarkingBuiltId] = useState<number | null>(null);
  const [burningId, setBurningId] = useState<number | null>(null);
  const [claimingId, setClaimingId] = useState<number | null>(null);

  // Read total ideas
  const { data: totalIdeas, refetch: refetchTotalIdeas } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "getTotalIdeas",
  });

  // Read CLAWD balance
  const { data: clawdBalance, refetch: refetchBalance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "balanceOf",
    args: [connectedAddress],
    query: { enabled: !!connectedAddress },
  });

  // Read allowance
  const { data: submitAllowance, refetch: refetchSubmitAllowance } = useScaffoldReadContract({
    contractName: "CLAWD",
    functionName: "allowance",
    args: [connectedAddress, ideaLabsAddress],
    query: { enabled: !!connectedAddress && !!ideaLabsAddress },
  });

  const hasSubmitAllowance = submitAllowance && submitCost && submitAllowance >= submitCost;
  const hasStakeAllowance = submitAllowance && stakeCost && submitAllowance >= stakeCost;

  // Contract writes — use object syntax (non-deprecated) and extract isMining for defense-in-depth
  const { writeContractAsync: writeIdeaLabs, isMining: isIdeaLabsMining } = useScaffoldWriteContract({
    contractName: "IdeaLabs",
  });
  const { writeContractAsync: writeCLAWD, isMining: isCLAWDMining } = useScaffoldWriteContract({
    contractName: "CLAWD",
  });

  // Global mining flag — ANY tx in progress means all write buttons should be disabled
  const isAnyMining = isIdeaLabsMining || isCLAWDMining;

  // Approve CLAWD for submit
  const handleApproveForSubmit = async () => {
    if (!connectedAddress || !ideaLabsAddress || !submitCost) return;
    setIsApprovingSubmit(true);
    try {
      await writeCLAWD({
        functionName: "approve",
        args: [ideaLabsAddress, submitCost],
      });
      notification.success("Approved CLAWD for submission!");
      refetchSubmitAllowance();
    } catch (e) {
      console.error(e);
      notification.error("Approval failed");
    } finally {
      setIsApprovingSubmit(false);
    }
  };

  // Approve CLAWD for stake
  const handleApproveForStake = async (ideaId: number) => {
    if (!connectedAddress || !ideaLabsAddress || !stakeCost) return;
    setApprovingStakeIdeaId(ideaId);
    try {
      await writeCLAWD({
        functionName: "approve",
        args: [ideaLabsAddress, stakeCost],
      });
      notification.success("Approved CLAWD for staking!");
      refetchSubmitAllowance();
    } catch (e) {
      console.error(e);
      notification.error("Approval failed");
    } finally {
      setApprovingStakeIdeaId(null);
    }
  };

  // Submit idea
  const handleSubmitIdea = async () => {
    if (!ideaContent.trim()) {
      notification.error("Please enter an idea");
      return;
    }
    setIsSubmitting(true);
    try {
      await writeIdeaLabs({
        functionName: "submitIdea",
        args: [ideaContent],
      });
      notification.success("Idea submitted to the lab!");
      setIdeaContent("");
      refetchTotalIdeas();
      refetchBalance();
      refetchSubmitAllowance();
    } catch (e) {
      console.error(e);
      notification.error("Submit failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Stake on idea
  const handleStake = async (ideaId: number) => {
    setStakingIdeaId(ideaId);
    try {
      await writeIdeaLabs({
        functionName: "stakeOnIdea",
        args: [BigInt(ideaId)],
      });
      notification.success("Research funded!");
      refetchTotalIdeas();
      refetchBalance();
      refetchSubmitAllowance();
    } catch (e) {
      console.error(e);
      notification.error("Stake failed");
    } finally {
      setStakingIdeaId(null);
    }
  };

  // Mark as built (admin)
  const handleMarkBuilt = async (ideaId: number) => {
    const payoutStr = payoutAmounts[ideaId] || "0";
    const payout = parseEther(payoutStr || "0");
    setMarkingBuiltId(ideaId);
    try {
      await writeIdeaLabs({
        functionName: "markBuilt",
        args: [BigInt(ideaId), payout],
      });
      notification.success("Research complete!");
      refetchTotalIdeas();
    } catch (e) {
      console.error(e);
      notification.error("Mark built failed");
    } finally {
      setMarkingBuiltId(null);
    }
  };

  // Burn idea (admin)
  const handleBurn = async (ideaId: number) => {
    setBurningId(ideaId);
    try {
      await writeIdeaLabs({
        functionName: "burnIdea",
        args: [BigInt(ideaId)],
      });
      notification.success("Specimen incinerated!");
      refetchTotalIdeas();
    } catch (e) {
      console.error(e);
      notification.error("Burn failed");
    } finally {
      setBurningId(null);
    }
  };

  // Claim payout
  const handleClaim = async (ideaId: number) => {
    setClaimingId(ideaId);
    try {
      await writeIdeaLabs({
        functionName: "claimPayout",
        args: [BigInt(ideaId)],
      });
      notification.success("Payout claimed!");
      refetchTotalIdeas();
      refetchBalance();
    } catch (e) {
      console.error(e);
      notification.error("Claim failed");
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen pb-10 graph-paper">
      {/* Hazard Warning Banner */}
      {!warningDismissed && (
        <div className="w-full border-b-4 border-warning bg-warning/10">
          <div className="container mx-auto px-4 py-4 max-w-4xl">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <p className="font-mono text-sm uppercase tracking-wide text-warning font-bold mb-1">
                  Laboratory Safety Notice
                </p>
                <p className="text-sm text-base-content/80">
                  Offensive or inappropriate content will have its staked CLAWD{" "}
                  <span className="text-error font-bold">incinerated</span> by the lab administrator. This experimental
                  apparatus is unaudited — use at your own risk.
                </p>
                <button
                  className="btn btn-sm btn-warning mt-3 font-mono uppercase tracking-wider"
                  onClick={dismissWarning}
                >
                  I Accept the Risk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Lab Header */}
        <div className="text-center mb-8">
          <div className="inline-block">
            {/* Clawd Scientist Mascot */}
            <div className="mb-4 flex justify-center">
              <div className="relative">
                <img
                  src="/clawd-scientist.jpg"
                  alt="Clawd the Lab Scientist"
                  className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-primary shadow-lg object-cover"
                  style={{
                    boxShadow: "0 0 20px rgba(13, 148, 136, 0.4), 0 8px 32px rgba(0,0,0,0.2)",
                  }}
                />
                {/* Bubbling beaker glow effect */}
                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-success/80 rounded-full animate-pulse flex items-center justify-center text-lg">
                  🧪
                </div>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              <span className="text-primary">$CLAWD</span>
              <span className="text-secondary">labs</span>
            </h1>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-base-content/50">
              Experimental Research Division
            </p>
          </div>
        </div>

        {/* Balance Display - Like a lab instrument readout */}
        {connectedAddress && clawdBalance !== undefined && (
          <div className="bg-base-100 border-2 border-base-300 p-4 mb-8">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-wider text-base-content/50">
                Specimen Funds Available
              </span>
              <div className="font-mono text-lg font-bold text-primary">
                {formatClawdAmount(clawdBalance)} <span className="text-secondary">$CLAWD</span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Idea Section - Lab Notebook Style */}
        <div className="bg-base-100 border-2 border-base-300 mb-8 overflow-hidden">
          {/* Header bar */}
          <div className="bg-primary/10 border-b-2 border-base-300 px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧪</span>
              <div>
                <h2 className="text-xl font-bold text-primary m-0">New Experiment Proposal</h2>
                <p className="font-mono text-xs uppercase tracking-wider text-base-content/50 m-0">
                  Submit idea for peer review
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 notebook-lines">
            <div className="mb-4 flex items-center gap-4 text-sm">
              <span className="font-mono text-xs uppercase tracking-wider text-base-content/50">Submission Fee:</span>
              <span className="font-mono font-bold text-secondary">
                {submitCost ? formatClawdAmount(submitCost) : "..."} $CLAWD
              </span>
              <span className="text-xs text-base-content/40">(burned on submission)</span>
            </div>

            <textarea
              className="textarea textarea-bordered w-full h-32 mb-4 font-sans bg-base-100 border-2 border-base-300 focus:border-primary"
              placeholder="Describe your experimental hypothesis... What should we build?"
              value={ideaContent}
              onChange={e => setIdeaContent(e.target.value)}
              maxLength={2000}
              disabled={isSubmitting || isApprovingSubmit || isAnyMining}
            />

            <div className="flex justify-between items-center">
              <span className="font-mono text-xs text-base-content/40">{ideaContent.length}/2000 characters</span>

              {!connectedAddress ? (
                <p className="font-mono text-xs uppercase tracking-wider text-error">Connect wallet to submit</p>
              ) : !hasSubmitAllowance ? (
                <button
                  className="btn btn-secondary"
                  onClick={handleApproveForSubmit}
                  disabled={isApprovingSubmit || isAnyMining || !submitCost}
                >
                  {isApprovingSubmit ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Approving...
                    </>
                  ) : (
                    `🔓 Approve ${submitCost ? formatClawdAmount(submitCost) : "..."} CLAWD`
                  )}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={handleSubmitIdea}
                  disabled={isSubmitting || !ideaContent.trim() || isAnyMining}
                >
                  {isSubmitting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Submitting...
                    </>
                  ) : (
                    "📋 Submit to Lab"
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Admin Panel - Like a control room */}
        {isAdmin && (
          <div className="bg-error/5 border-2 border-error mb-8 overflow-hidden">
            <div className="bg-error/10 border-b-2 border-error px-6 py-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔬</span>
                <div>
                  <h2 className="text-xl font-bold text-error m-0">Lab Administrator Console</h2>
                  <p className="font-mono text-xs uppercase tracking-wider text-error/70 m-0">
                    Full specimen control access
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4">
              <p className="text-sm text-base-content/70 m-0">
                You have administrative access. Mark experiments as successful or incinerate inappropriate specimens.
              </p>
            </div>
          </div>
        )}

        {/* Ideas List Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">📊</span>
            <h2 className="text-2xl font-bold m-0">Active Experiments</h2>
          </div>
          <p className="font-mono text-xs uppercase tracking-wider text-base-content/50">
            Specimens sorted by total funding • Stake {stakeCost ? formatClawdAmount(stakeCost) : "..."} $CLAWD to
            support research
          </p>
        </div>

        {/* Ideas Cards */}
        <IdeasList
          totalIdeas={Number(totalIdeas || 0)}
          connectedAddress={connectedAddress}
          isAdmin={isAdmin}
          onStake={handleStake}
          onApproveStake={handleApproveForStake}
          onMarkBuilt={handleMarkBuilt}
          onBurn={handleBurn}
          onClaim={handleClaim}
          stakingIdeaId={stakingIdeaId}
          approvingStakeIdeaId={approvingStakeIdeaId}
          markingBuiltId={markingBuiltId}
          burningId={burningId}
          claimingId={claimingId}
          payoutAmounts={payoutAmounts}
          setPayoutAmounts={setPayoutAmounts}
          hasStakeAllowance={!!hasStakeAllowance}
          isAnyMining={isAnyMining}
          stakeCost={stakeCost}
        />

        {(!totalIdeas || totalIdeas === 0n) && (
          <div className="text-center py-16 bg-base-100 border-2 border-dashed border-base-300">
            <span className="text-5xl mb-4 block opacity-50">🧫</span>
            <p className="text-xl mb-2 font-mono text-base-content/50">No specimens in the lab</p>
            <p className="text-sm text-base-content/40">Be the first to submit an experiment proposal above.</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="font-mono text-xs text-base-content/30 uppercase tracking-wider">
            🔬 A Clawd Labs Production • Built by an AI, totally unaudited
          </p>
        </div>
      </div>
    </div>
  );
};

// Component to list all ideas
function IdeasList({
  totalIdeas,
  connectedAddress,
  isAdmin,
  onStake,
  onApproveStake,
  onMarkBuilt,
  onBurn,
  onClaim,
  stakingIdeaId,
  approvingStakeIdeaId,
  markingBuiltId,
  burningId,
  claimingId,
  payoutAmounts,
  setPayoutAmounts,
  hasStakeAllowance,
  isAnyMining,
  stakeCost,
}: {
  totalIdeas: number;
  connectedAddress: string | undefined;
  isAdmin: boolean;
  onStake: (id: number) => void;
  onApproveStake: (id: number) => void;
  onMarkBuilt: (id: number) => void;
  onBurn: (id: number) => void;
  onClaim: (id: number) => void;
  stakingIdeaId: number | null;
  approvingStakeIdeaId: number | null;
  markingBuiltId: number | null;
  burningId: number | null;
  claimingId: number | null;
  payoutAmounts: Record<number, string>;
  setPayoutAmounts: (val: Record<number, string>) => void;
  hasStakeAllowance: boolean;
  isAnyMining: boolean;
  stakeCost: bigint | undefined;
}) {
  // Collect sort data from each IdeaCard as it loads
  const [ideaSortData, setIdeaSortData] = useState<
    Record<number, { totalStaked: bigint; isBurned: boolean; isBuilt: boolean }>
  >({});

  const handleIdeaDataLoaded = useCallback(
    (id: number, data: { totalStaked: bigint; isBurned: boolean; isBuilt: boolean }) => {
      setIdeaSortData(prev => {
        const existing = prev[id];
        // Only update if data actually changed to avoid infinite re-renders
        if (
          existing &&
          existing.totalStaked === data.totalStaked &&
          existing.isBurned === data.isBurned &&
          existing.isBuilt === data.isBuilt
        ) {
          return prev;
        }
        return { ...prev, [id]: data };
      });
    },
    [],
  );

  // Sort idea IDs: active (by totalStaked desc) → built (by totalStaked desc) → burned
  const sortedIds = useMemo(() => {
    const ids = Array.from({ length: totalIdeas }, (_, i) => i + 1);
    return ids.sort((a, b) => {
      const dataA = ideaSortData[a];
      const dataB = ideaSortData[b];
      // If data not loaded yet, keep original order
      if (!dataA && !dataB) return 0;
      if (!dataA) return 1;
      if (!dataB) return -1;
      // Burned always at bottom
      if (dataA.isBurned && !dataB.isBurned) return 1;
      if (!dataA.isBurned && dataB.isBurned) return -1;
      if (dataA.isBurned && dataB.isBurned) return 0;
      // Built after active
      if (dataA.isBuilt && !dataB.isBuilt) return 1;
      if (!dataA.isBuilt && dataB.isBuilt) return -1;
      // Sort by totalStaked descending
      if (dataA.totalStaked > dataB.totalStaked) return -1;
      if (dataA.totalStaked < dataB.totalStaked) return 1;
      return 0;
    });
  }, [ideaSortData, totalIdeas]);

  if (totalIdeas === 0) return null;

  return (
    <div className="space-y-4">
      {sortedIds.map(i => (
        <IdeaCard
          key={i}
          ideaId={i}
          connectedAddress={connectedAddress}
          isAdmin={isAdmin}
          onStake={onStake}
          onApproveStake={onApproveStake}
          onMarkBuilt={onMarkBuilt}
          onBurn={onBurn}
          onClaim={onClaim}
          isStaking={stakingIdeaId === i}
          isApprovingStake={approvingStakeIdeaId === i}
          isMarkingBuilt={markingBuiltId === i}
          isBurning={burningId === i}
          isClaiming={claimingId === i}
          payoutAmount={payoutAmounts[i] || ""}
          setPayoutAmount={val => setPayoutAmounts({ ...payoutAmounts, [i]: val })}
          hasStakeAllowance={hasStakeAllowance}
          isAnyMining={isAnyMining}
          stakeCost={stakeCost}
          onDataLoaded={handleIdeaDataLoaded}
        />
      ))}
    </div>
  );
}

// Individual idea card - Specimen Card Style
function IdeaCard({
  ideaId,
  connectedAddress,
  isAdmin,
  onStake,
  onApproveStake,
  onMarkBuilt,
  onBurn,
  onClaim,
  isStaking,
  isApprovingStake,
  isMarkingBuilt,
  isBurning,
  isClaiming,
  payoutAmount,
  setPayoutAmount,
  hasStakeAllowance,
  isAnyMining,
  stakeCost,
  onDataLoaded,
}: {
  ideaId: number;
  connectedAddress: string | undefined;
  isAdmin: boolean;
  onStake: (id: number) => void;
  onApproveStake: (id: number) => void;
  onMarkBuilt: (id: number) => void;
  onBurn: (id: number) => void;
  onClaim: (id: number) => void;
  isStaking: boolean;
  isApprovingStake: boolean;
  isMarkingBuilt: boolean;
  isBurning: boolean;
  isClaiming: boolean;
  payoutAmount: string;
  setPayoutAmount: (val: string) => void;
  hasStakeAllowance: boolean;
  isAnyMining: boolean;
  stakeCost: bigint | undefined;
  onDataLoaded?: (id: number, data: { totalStaked: bigint; isBurned: boolean; isBuilt: boolean }) => void;
}) {
  // Read idea data
  const { data: ideaData } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "getIdea",
    args: [BigInt(ideaId)],
  });

  // Check if user has staked
  const { data: hasStaked } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "hasStaked",
    args: [BigInt(ideaId), connectedAddress as `0x${string}`],
  });

  // Check if user can claim
  const { data: canClaim } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "canClaim",
    args: [BigInt(ideaId), connectedAddress as `0x${string}`],
  });

  // Get claimable amount
  const { data: claimableAmount } = useScaffoldReadContract({
    contractName: "IdeaLabs",
    functionName: "getClaimableAmount",
    args: [BigInt(ideaId), connectedAddress as `0x${string}`],
  });

  // Report sort data to parent for sorting
  useEffect(() => {
    if (ideaData && onDataLoaded) {
      const idea = ideaData as Idea;
      onDataLoaded(ideaId, {
        totalStaked: idea.totalStaked,
        isBurned: idea.isBurned,
        isBuilt: idea.isBuilt,
      });
    }
  }, [ideaData, ideaId, onDataLoaded]);

  if (!ideaData) {
    return (
      <div className="bg-base-100 border-2 border-base-300 animate-pulse">
        <div className="p-6">
          <div className="h-4 bg-base-300 mb-4 w-1/4"></div>
          <div className="h-20 bg-base-300"></div>
        </div>
      </div>
    );
  }

  const idea = ideaData as Idea;

  // Burned specimen
  if (idea.isBurned) {
    return (
      <div className="bg-base-100 border-2 border-error/30 opacity-60">
        <div className="bg-error/10 border-b border-error/30 px-6 py-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs uppercase tracking-wider text-error">🔥 Specimen Incinerated</span>
            <span className="font-mono text-xs text-base-content/30">#{ideaId.toString().padStart(3, "0")}</span>
          </div>
        </div>
        <div className="p-6">
          <p className="text-base-content/40 italic m-0">
            This specimen was incinerated for violating laboratory guidelines.
          </p>
        </div>
      </div>
    );
  }

  const isSuccess = idea.isBuilt;

  return (
    <div className={`bg-base-100 border-2 overflow-hidden ${isSuccess ? "border-success" : "border-base-300"}`}>
      {/* Specimen Header */}
      <div
        className={`border-b-2 px-6 py-3 ${
          isSuccess ? "bg-success/10 border-success" : "bg-primary/5 border-base-300"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-base-content/40">
              SPECIMEN #{ideaId.toString().padStart(3, "0")}
            </span>
            {isSuccess && (
              <span className="font-mono text-xs uppercase tracking-wider text-success font-bold px-2 py-1 bg-success/20">
                ✓ Research Complete
              </span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <span className="font-mono text-xs uppercase tracking-wider text-base-content/40 block">
                Total Funding
              </span>
              <span className="font-mono text-lg font-bold text-primary">
                {formatClawdAmount(idea.totalStaked)} <span className="text-xs text-secondary">$CLAWD</span>
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono text-xs uppercase tracking-wider text-base-content/40 block">Backers</span>
              <span className="font-mono text-lg font-bold">{idea.stakerCount.toString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Specimen Content */}
      <div className="p-6">
        <p className="whitespace-pre-wrap text-base-content/90 mb-4">{idea.content}</p>

        {/* Researcher Info */}
        <div className="flex items-center gap-2 text-sm mb-4 pb-4 border-b border-base-300">
          <span className="font-mono text-xs uppercase tracking-wider text-base-content/40">Principal Researcher:</span>
          <Address address={idea.creator} />
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {/* Stake button */}
          {!idea.isBuilt &&
            !hasStaked &&
            connectedAddress &&
            (!hasStakeAllowance ? (
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onApproveStake(ideaId)}
                disabled={isApprovingStake || isAnyMining || !stakeCost}
              >
                {isApprovingStake || isAnyMining ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    {isApprovingStake ? "Approving..." : "Processing..."}
                  </>
                ) : (
                  `🔓 Approve ${stakeCost ? formatClawdAmount(stakeCost) : "..."} CLAWD`
                )}
              </button>
            ) : (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => onStake(ideaId)}
                disabled={isStaking || isAnyMining}
              >
                {isStaking || isAnyMining ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    {isStaking ? "Funding..." : "Processing..."}
                  </>
                ) : (
                  `💰 Fund Research (${stakeCost ? formatClawdAmount(stakeCost) : "..."} CLAWD)`
                )}
              </button>
            ))}

          {/* Already staked indicator */}
          {hasStaked && !idea.isBuilt && (
            <span className="font-mono text-xs uppercase tracking-wider text-primary bg-primary/10 px-3 py-2">
              ✓ You backed this research
            </span>
          )}

          {/* Claim button */}
          {idea.isBuilt && canClaim && (
            <button
              className="btn btn-success btn-sm"
              onClick={() => onClaim(ideaId)}
              disabled={isClaiming || isAnyMining}
            >
              {isClaiming || isAnyMining ? (
                <>
                  <span className="loading loading-spinner loading-xs"></span>
                  {isClaiming ? "Claiming..." : "Processing..."}
                </>
              ) : (
                `🎁 Claim ${claimableAmount ? formatClawdAmount(claimableAmount) : "0"} CLAWD`
              )}
            </button>
          )}

          {/* Admin actions */}
          {isAdmin && !idea.isBuilt && (
            <>
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="number"
                  className="input input-bordered input-sm w-24 font-mono"
                  placeholder="Payout"
                  value={payoutAmount}
                  onChange={e => setPayoutAmount(e.target.value)}
                  disabled={isMarkingBuilt || isAnyMining}
                />
                <button
                  className="btn btn-success btn-sm"
                  onClick={() => onMarkBuilt(ideaId)}
                  disabled={isMarkingBuilt || isAnyMining}
                >
                  {isMarkingBuilt || isAnyMining ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                    </>
                  ) : (
                    "✓ Complete"
                  )}
                </button>
                <button
                  className="btn btn-error btn-sm"
                  onClick={() => onBurn(ideaId)}
                  disabled={isBurning || isAnyMining}
                >
                  {isBurning || isAnyMining ? (
                    <>
                      <span className="loading loading-spinner loading-xs"></span>
                    </>
                  ) : (
                    "🔥 Incinerate"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Home;
