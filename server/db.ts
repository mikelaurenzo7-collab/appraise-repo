import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, propertySubmissions, InsertPropertySubmission, propertyAnalysis, InsertPropertyAnalysis } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createPropertySubmission(submission: InsertPropertySubmission) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create submission: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(propertySubmissions).values(submission);
    // Return the inserted record with the generated ID
    const insertedId = (result as any).insertId || submission.id;
    const record = await db
      .select()
      .from(propertySubmissions)
      .where(eq(propertySubmissions.id, insertedId))
      .limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create property submission:", error);
    throw error;
  }
}

export async function getPropertySubmissionById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get submission: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(propertySubmissions)
      .where(eq(propertySubmissions.id, id))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get property submission:", error);
    throw error;
  }
}

export async function updatePropertySubmission(id: number, updates: Partial<InsertPropertySubmission>) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update submission: database not available");
    return undefined;
  }

  try {
    // Filter out undefined values
    const updateData = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await db.update(propertySubmissions).set(updateData).where(eq(propertySubmissions.id, id));

    return await getPropertySubmissionById(id);
  } catch (error) {
    console.error("[Database] Failed to update property submission:", error);
    throw error;
  }
}

export async function createPropertyAnalysis(analysis: InsertPropertyAnalysis) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create analysis: database not available");
    return undefined;
  }

  try {
    const result = await db.insert(propertyAnalysis).values(analysis);
    const insertedId = (result as any).insertId || analysis.id;
    const record = await db
      .select()
      .from(propertyAnalysis)
      .where(eq(propertyAnalysis.id, insertedId))
      .limit(1);
    return record.length > 0 ? record[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to create property analysis:", error);
    throw error;
  }
}

export async function getPropertyAnalysisBySubmissionId(submissionId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get analysis: database not available");
    return undefined;
  }

  try {
    const result = await db
      .select()
      .from(propertyAnalysis)
      .where(eq(propertyAnalysis.submissionId, submissionId))
      .limit(1);
    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get property analysis:", error);
    throw error;
  }
}
