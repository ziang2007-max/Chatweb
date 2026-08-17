const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Tìm kiếm người dùng theo username (không bao gồm chính mình)
router.get('/search', async (req, res) => {
  try {
    const { q, currentUserId } = req.query;
    if (!q) return res.json([]);

    const users = await prisma.user.findMany({
      where: {
        username: {
          contains: q
        },
        id: {
          not: parseInt(currentUserId)
        }
      },
      select: {
        id: true,
        username: true
      },
      take: 10
    });
    res.json(users);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Lấy danh sách bạn bè và lời mời kết bạn của 1 user
router.get('/:userId/friends', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);

    // Bạn bè (đã ACCEPTED)
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { userId: userId, status: 'ACCEPTED' },
          { friendId: userId, status: 'ACCEPTED' }
        ]
      },
      include: {
        user: { select: { id: true, username: true } },
        friend: { select: { id: true, username: true } }
      }
    });

    const friends = friendships.map(f => {
      if (f.userId === userId) return f.friend;
      return f.user;
    });

    // Lời mời kết bạn (PENDING và gửi ĐẾN userId này)
    const friendRequests = await prisma.friendship.findMany({
      where: {
        friendId: userId,
        status: 'PENDING'
      },
      include: {
        user: { select: { id: true, username: true } }
      }
    });

    res.json({
      friends,
      friendRequests: friendRequests.map(fr => ({ id: fr.id, sender: fr.user }))
    });
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Gửi lời mời kết bạn
router.post('/friends/request', async (req, res) => {
  try {
    const { userId, friendId } = req.body;

    // Check if already friends or requested
    const existing = await prisma.friendship.findFirst({
      where: {
        OR: [
          { userId: parseInt(userId), friendId: parseInt(friendId) },
          { userId: parseInt(friendId), friendId: parseInt(userId) }
        ]
      }
    });

    if (existing) {
      return res.status(400).json({ error: 'Friendship or request already exists' });
    }

    const request = await prisma.friendship.create({
      data: {
        userId: parseInt(userId),
        friendId: parseInt(friendId),
        status: 'PENDING'
      }
    });

    res.json({ message: 'Friend request sent', request });
  } catch (error) {
    console.error('Friend request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Chấp nhận lời mời kết bạn
router.post('/friends/accept', async (req, res) => {
  try {
    const { requestId } = req.body;

    const friendship = await prisma.friendship.update({
      where: { id: parseInt(requestId) },
      data: { status: 'ACCEPTED' }
    });

    res.json({ message: 'Friend request accepted', friendship });
  } catch (error) {
    console.error('Accept request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Từ chối lời mời kết bạn / Hủy kết bạn
router.post('/friends/reject', async (req, res) => {
  try {
    const { requestId } = req.body;

    await prisma.friendship.delete({
      where: { id: parseInt(requestId) }
    });

    res.json({ message: 'Friend request rejected/removed' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
