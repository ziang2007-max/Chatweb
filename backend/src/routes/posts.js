const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Get all posts with their comments and authors
router.get('/', async (req, res) => {
  try {
    const posts = await prisma.post.findMany({
      include: {
        author: {
          select: { id: true, username: true }
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Create a new post
router.post('/', async (req, res) => {
  try {
    const { imageUrl, caption, authorId } = req.body;
    const post = await prisma.post.create({
      data: {
        imageUrl,
        caption,
        authorId: parseInt(authorId)
      },
      include: {
        author: { select: { id: true, username: true } },
        comments: true
      }
    });
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Create a new comment
router.post('/:id/comments', async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { content, authorId, parentId } = req.body;
    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
        authorId: parseInt(authorId),
        parentId: parentId ? parseInt(parentId) : null
      },
      include: {
        author: { select: { id: true, username: true } }
      }
    });
    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

module.exports = router;
