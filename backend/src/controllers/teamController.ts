import { Request, Response } from 'express';
import { Team } from '../models/Team';
import { User } from '../models/User';
import { logActivity } from '../utils/logActivity';

// ── GET /api/teams ──────────────────────────────────────────────────────────

export const getTeams = async (req: Request, res: Response) => {
  try {
    const teams = await Team.find()
      .populate('members', 'name email role isActive avatar')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, teams });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams' });
  }
};

// ── GET /api/teams/:id ──────────────────────────────────────────────────────

export const getTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id)
      .populate('members', 'name email role isActive avatar phone department')
      .populate('createdBy', 'name email');

    if (!team) return res.status(404).json({ error: 'Team not found' });
    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team' });
  }
};

// ── POST /api/teams ─────────────────────────────────────────────────────────

export const createTeam = async (req: Request, res: Response) => {
  try {
    const { name, description, color, icon, members } = req.body;

    if (!name?.trim()) return res.status(400).json({ error: 'Team name is required' });

    const existing = await Team.findOne({ name: { $regex: `^${name.trim()}$`, $options: 'i' } });
    if (existing) return res.status(409).json({ error: 'A team with this name already exists' });

    // Validate members exist
    const memberIds: string[] = Array.isArray(members) ? members : [];

    const team = await Team.create({
      name: name.trim(),
      description: description?.trim(),
      color: color || '#6366f1',
      icon: icon?.trim(),
      members: memberIds,
      createdBy: req.user._id,
    });

    await team.populate('members', 'name email role');
    await logActivity(req.user, 'CREATE_TEAM', 'teams', team.name, team._id.toString(), { memberCount: memberIds.length });

    res.status(201).json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create team' });
  }
};

// ── PATCH /api/teams/:id ────────────────────────────────────────────────────

export const updateTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const { name, description, color, icon } = req.body;
    if (name) team.name = name.trim();
    if (description !== undefined) team.description = description?.trim();
    if (color) team.color = color;
    if (icon !== undefined) team.icon = icon?.trim();

    await team.save();
    await logActivity(req.user, 'UPDATE_TEAM', 'teams', team.name, team._id.toString());

    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update team' });
  }
};

// ── POST /api/teams/:id/members ─────────────────────────────────────────────

export const addTeamMember = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const [team, user] = await Promise.all([
      Team.findById(req.params.id),
      User.findById(userId),
    ]);

    if (!team) return res.status(404).json({ error: 'Team not found' });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (!team.members.map(String).includes(userId)) {
      team.members.push(user._id as any);
      await team.save();
    }

    await team.populate('members', 'name email role isActive');
    await logActivity(req.user, 'ADD_TEAM_MEMBER', 'teams', team.name, team._id.toString(), { addedUser: user.name });

    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
};

// ── DELETE /api/teams/:id/members/:userId ───────────────────────────────────

export const removeTeamMember = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    const user = await User.findById(req.params.userId);
    team.members = team.members.filter(m => m.toString() !== req.params.userId) as any;
    await team.save();

    await team.populate('members', 'name email role isActive');
    await logActivity(req.user, 'REMOVE_TEAM_MEMBER', 'teams', team.name, team._id.toString(), { removedUser: user?.name });

    res.json({ success: true, team });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

// ── DELETE /api/teams/:id ───────────────────────────────────────────────────

export const deleteTeam = async (req: Request, res: Response) => {
  try {
    const team = await Team.findById(req.params.id);
    if (!team) return res.status(404).json({ error: 'Team not found' });

    await Team.deleteOne({ _id: team._id });
    await logActivity(req.user, 'DELETE_TEAM', 'teams', team.name, team._id.toString());

    res.json({ success: true, message: `Team "${team.name}" deleted` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete team' });
  }
};
