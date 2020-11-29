import * as admin from "firebase-admin";

const db = admin.firestore();

export async function deleteCollection(
  collectionPath: string,
  batchSize: number = 100
): Promise<any> {
  try {
    const collectionRef = db.collection(collectionPath);
    const query = collectionRef.limit(batchSize);

    return new Promise((resolve, reject) => {
      deleteQueryBatch(query, resolve).catch(reject);
    });
  } catch (error) {
    throw error;
  }
}

async function deleteQueryBatch(query: any, resolve: Function): Promise<any> {
  const snapshot = await query.get();

  const batchSize = snapshot.size;
  if (batchSize === 0) {
    // When there are no documents left, we are done
    resolve();
    return;
  }

  // Delete documents in a batch
  const batch = db.batch();
  snapshot.docs.forEach((doc: any) => {
    batch.delete(doc.ref);
  });
  await batch.commit();

  // Recurse on the next process tick, to avoid
  // exploding the stack.
  process.nextTick(() => {
    return deleteQueryBatch(query, resolve);
  });
}
