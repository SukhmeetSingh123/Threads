"use server"
import { connectToDB } from "../mongoose"
import Thread from "../models/thread.model";
import User from "../models/user.model";
import { revalidatePath } from "next/cache";

interface Params {
    text: string,
    author: string,
    communityId: string | null,
    path: string
}

export async function createThread({ text, author, communityId, path }: Params) {
    try{

        connectToDB();
        const createThread = await Thread.create({
            text,
            author,
            communityId: null,
        });
        
        await User.findByIdAndUpdate(author, {
            $push: { threads: createThread._id }
        })
        
        revalidatePath(path);
    }catch(error:any){
        throw new Error (`Error Creating Thread :${error.message}`)
    }
}

export async function fetchPosts(pageNumber=1,pageSize=20){
    connectToDB()
    const skipAmount=(pageNumber-1)*pageSize;
    const postQuery =Thread.find({parentId:{$in:[null,undefined]}})
    .sort({createAt:'desc'})
    .skip(skipAmount)
    .limit(pageSize)
    .populate({path:'author',model:User})
    .populate({
        path:'children',
        populate:({
            path:'author',
            model:User,
            select:"_id name parentId image"
        })
    })
    const totalPostCount=await Thread.countDocuments({parentId:{$in:[null,undefined]}})
    const posts=await postQuery.exec();
    const isNext=totalPostCount>skipAmount+posts.length;
    return {posts,isNext}
}

export async function fetchThreadById(threadId: string) {
  
  try {
    connectToDB();
    const thread = await Thread.findById(threadId)
        .populate({
          path: "author",
          model: User,
          select: "_id id name image",
        }) // Populate the author field with _id and username
        // .populate({
        //   path: "community",
        //   model: Community,
        //   select: "_id id name image",
        // }) // Populate the community field with _id and name
        .populate({
          path: "children", // Populate the children field
          populate: [
            {
              path: "author", // Populate the author field within children
              model: User,
              select: "_id id name parentId image", // Select only _id and username fields of the author
            },
            {
              path: "children", // Populate the children field within children
              model: Thread, // The model of the nested children (assuming it's the same "Thread" model)
              populate: {
                path: "author", // Populate the author field within nested children
                model: User,
                select: "_id id name parentId image", // Select only _id and username fields of the author
              },
            },
          ],
        })
        .exec();
  
      return thread;
    } catch (err) {
      console.error("Error while fetching thread:", err);
      throw new Error("Unable to fetch thread");
    }
  }

export async function addCommentToThread(
    threadId: string,
    commentText: string,
    userId: string,
    path: string
  ) {
    
    try {
      connectToDB();
      // Find the original thread by its ID
      let originalThread = await Thread.findById(threadId);
      if (!originalThread) {
        throw new Error("Thread not found");
      }
      const commentThread = new Thread({
        text: commentText,
        author: userId,
        parentId: threadId,
      });
  
      const savedCommentThread = await commentThread.save();
  
      originalThread.children.push(savedCommentThread._id);
  
      await originalThread.save();
  
      revalidatePath(path);
    } catch (error) {
      console.error("Error while adding comment:", error);
      throw new Error("Unable to add comment");
    }
  }
  
  