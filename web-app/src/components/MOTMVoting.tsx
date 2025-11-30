'use client';

import { useState, useEffect } from 'react';

interface Player {
    id: string;
    name: string;
    position: string;
}

interface VoteData {
    player_id: string;
    player_name: string;
    vote_count: number;
}

interface MOTMVotingProps {
    matchId: string;
    players: Player[];
}

export function MOTMVoting({ matchId, players }: MOTMVotingProps) {
    const [votes, setVotes] = useState<VoteData[]>([]);
    const [userVote, setUserVote] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [voting, setVoting] = useState(false);

    useEffect(() => {
        loadVotingData();
        // Auto-refresh every 10 seconds
        const interval = setInterval(loadVotingData, 10000);
        return () => clearInterval(interval);
    }, [matchId]);

    const loadVotingData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/v1/motm/${matchId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (data.success) {
                setVotes(data.data.votes || []);
                setUserVote(data.data.userVote);
            }
        } catch (error) {
            console.error('Failed to load voting data:', error);
        } finally {
            setLoading(false);
        }
    };

    const castVote = async (playerId: string) => {
        setVoting(true);
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/v1/motm/${matchId}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ playerId }),
            });
            setUserVote(playerId);
            await loadVotingData();
        } catch (error) {
            console.error('Failed to cast vote:', error);
        } finally {
            setVoting(false);
        }
    };

    const getVoteCount = (playerId: string): number => {
        const vote = votes.find(v => v.player_id === playerId);
        return vote ? vote.vote_count : 0;
    };

    const getTotalVotes = (): number => {
        return votes.reduce((sum, v) => sum + v.vote_count, 0);
    };

    const getVotePercentage = (playerId: string): number => {
        const total = getTotalVotes();
        if (total === 0) return 0;
        return Math.round((getVoteCount(playerId) / total) * 100);
    };

    const getWinner = (): VoteData | null => {
        if (votes.length === 0) return null;
        return votes.reduce((max, curr) =>
            curr.vote_count > max.vote_count ? curr : max
        );
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
                <p className="text-gray-500">Loading votes...</p>
            </div>
        );
    }

    const winner = getWinner();
    const totalVotes = getTotalVotes();

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                ⚽ Man of the Match
                {totalVotes > 0 && (
                    <span className="text-sm font-normal text-gray-500">
                        ({totalVotes} {totalVotes === 1 ? 'vote' : 'votes'})
                    </span>
                )}
            </h3>

            {winner && totalVotes >= 3 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-800/10 rounded-lg border-2 border-yellow-400">
                    <div className="flex items-center gap-3">
                        <span className="text-4xl">🏆</span>
                        <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Current Leader</p>
                            <p className="text-xl font-bold">{winner.player_name}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                {winner.vote_count} {winner.vote_count === 1 ? 'vote' : 'votes'} ({getVotePercentage(winner.player_id)}%)
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-3">
                {players.map((player) => {
                    const voteCount = getVoteCount(player.id);
                    const percentage = getVotePercentage(player.id);
                    const hasVoted = userVote === player.id;

                    return (
                        <div
                            key={player.id}
                            className={`relative overflow-hidden rounded-lg border-2 transition-all ${hasVoted
                                    ? 'border-brand bg-brand/5'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-brand/50'
                                }`}
                        >
                            {/* Vote background indicator */}
                            {totalVotes > 0 && (
                                <div
                                    className="absolute inset-y-0 left-0 bg-brand/10 transition-all"
                                    style={{ width: `${percentage}%` }}
                                />
                            )}

                            <button
                                onClick={() => castVote(player.id)}
                                disabled={voting || hasVoted}
                                className="relative w-full p-4 text-left flex items-center justify-between disabled:cursor-not-allowed"
                            >
                                <div className="flex items-center gap-3">
                                    {hasVoted && <span className="text-brand text-xl">✓</span>}
                                    <div>
                                        <p className="font-semibold">{player.name}</p>
                                        <p className="text-sm text-gray-500">{player.position}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    {totalVotes > 0 && (
                                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                                            {percentage}%
                                        </span>
                                    )}
                                    <span className="text-lg font-bold text-brand">
                                        {voteCount}
                                    </span>
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>

            {userVote && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                    You voted for {players.find(p => p.id === userVote)?.name}. Click another player to change your vote.
                </p>
            )}

            {!userVote && players.length > 0 && (
                <p className="mt-4 text-sm text-gray-500 text-center">
                    Click a player to cast your vote
                </p>
            )}
        </div>
    );
}
