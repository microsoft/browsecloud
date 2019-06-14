// <copyright file="JobHelper.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Common.Helpers
{
    using System;
    using System.Collections.Generic;
    using System.Diagnostics.Contracts;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Models.Extensions;
    using BrowseCloud.Service.Services.AzureBatch;
    using BrowseCloud.Service.Services.AzureStorage;
    using BrowseCloud.Service.Services.DocumentDb;
    using Microsoft.Extensions.Logging;

    /// <summary>
    /// Helper Methods for the Jobs Controller and dealing with BatchJob entities.
    /// </summary>
    public static class JobHelper
    {
        /// <summary>
        /// Makes a new BatchJob entity, stores it, and starts it as a task on Azure Batch.
        /// </summary>
        /// <param name="doc">Document entity.</param>
        /// <param name="commandPrefix">How to start the batch CLI command</param>
        /// <param name="docDbService">IDocDbService.</param>
        /// <param name="batchService">IBatchService.</param>
        /// <param name="logger">Logger</param>
        /// <param name="job">Starter BatchJob</param>
        /// <returns></returns>
        public static async Task<BatchJob> MakeBatchJob(Document doc, string commandPrefix, IDocumentDbService docDbService, IBatchService batchService, ILogger logger, BatchJob job = null)
        {
            Contract.Requires(batchService != null, nameof(batchService));
            Contract.Requires(docDbService != null, nameof(docDbService));

            if (doc == null)
            {
                throw new BrowseCloudServiceException("Cannot creata a job for a null document.");
            }

            var newJob = new BatchJob(doc.Id, job);

            if (string.IsNullOrWhiteSpace(commandPrefix))
            {
                throw new BrowseCloudAppSettingNotFoundException("Must provide a command prefix");
            }

            string commandLineText = "NOOP";
            switch (newJob.JobType)
            {
                case JobType.CountingGridGeneration:
                    commandLineText = $"{commandPrefix} & python generateCountingGridsFromAzure.py {doc.Id} {newJob.ExtentSize} {newJob.WindowSize} numpyEngine {(doc.InputType == InputType.SimpleInput ? "simpleInput" : "metadataInput")} {doc.BlobFileName()} {newJob.Id}";
                    break;
                case JobType.SentimentColoring:
                    commandLineText = $"{commandPrefix} & python generateSentimentColoringFromAzure.py {newJob.TargetId} {newJob.Id} {newJob.WindowSize}";
                    break;
                case JobType.MetadataColoring:
                    commandLineText = $"{commandPrefix} & python generateMetadataColoringFromAzure.py {newJob.TargetId} {newJob.TargetColumnName} {newJob.Id} {newJob.WindowSize}";
                    break;
            }

            await RetryHelper.RetryTask(batchService.StartJobWithTask(newJob.Id.ToString(), commandLineText));
            logger.LogInformation($"Started batch job task for job {newJob.Id.ToString()}.");

            await RetryHelper.RetryTask(docDbService.UpsertDocument(newJob));
            logger.LogInformation($"Uploaded DocumentDB entity for job {newJob.Id.ToString()}.");

            return newJob;
        }

        /// <summary>
        /// Gets a document from the model files of a job.
        /// </summary>
        /// <param name="job">Job</param>
        /// <param name="fileName">The full name of the tile to get.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <returns></returns>
        public static async Task<string> GetFileFromJob(BatchJob job, string fileName, IStorageService storageService)
        {
            Contract.Requires(storageService != null, nameof(storageService));

            if (job == null)
            {
                throw new BrowseCloudServiceException("Cannot get document for a null job.");
            }

            if (string.IsNullOrWhiteSpace(fileName))
            {
                throw new BrowseCloudValidationException("Cannot get the document because the filename is empty");
            }

            if (job.JobStatus != JobStatus.Success && job.JobStatus != JobStatus.Failure)
            {
                throw new BrowseCloudValidationException($"Job {job.Id} has not finished yet. Please wait until it is finished to access the files.");
            }

            return await RetryHelper.RetryTask(storageService.GetStringFromBlob(StorageAccount.Model, job.Id.ToString(), fileName));
        }

        /// <summary>
        /// Delete all jobs and model files associated with a document.
        /// </summary>
        /// <param name="doc">Document to delete jobs for.</param>
        /// <param name="docDbService">IDocDbService.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <param name="batchService">Azure Batch Service</param>
        /// <param name="logger">Logger</param>
        /// <returns></returns>
        public static async Task DeleteJobsAndResourcesFromDoc(Document doc, IDocumentDbService docDbService, IStorageService storageService, IBatchService batchService, ILogger logger)
        {
            Contract.Requires(docDbService != null, nameof(docDbService));
            Contract.Requires(doc != null, nameof(doc));

            var jobs = await docDbService.GetDocuments<BatchJob>((j) => j.DocumentId == doc.Id);

            List<Task> taskList = new List<Task>();

            foreach (var job in jobs)
            {
                taskList.Add(DeleteJobAndResources(job, docDbService, storageService, batchService, logger));
            }

            try
            {
                await Task.WhenAll(taskList);
            }
            catch (AggregateException ex)
            {
                var message = $"Not able to delete {ex.InnerExceptions.Count} of the {taskList.Count} jobs for document {doc.Id}.";

                foreach (var e in ex.InnerExceptions)
                {
                    message += $" {e.Message}";
                }

                throw new BrowseCloudServiceException(message);
            }
        }

        /// <summary>
        /// Delete job and model files.
        /// </summary>
        /// <param name="job">Job to delete.</param>
        /// <param name="docDbService">IDocDbService.</param>
        /// <param name="storageService">IStorageService.</param>
        /// <param name="batchService">Azure Batch Service</param>
        /// <param name="logger">Logger</param>
        /// <returns></returns>
        public static async Task DeleteJobAndResources(BatchJob job, IDocumentDbService docDbService, IStorageService storageService, IBatchService batchService, ILogger logger)
        {
            Contract.Requires(docDbService != null, nameof(docDbService));
            Contract.Requires(storageService != null, nameof(storageService));
            Contract.Requires(batchService != null, nameof(batchService));
            Contract.Requires(job != null, nameof(job));

            await RetryHelper.RetryTask(batchService.TerminateTask(job.Id.ToString()));
            logger.LogInformation($"Terminated batch job task for job {job.Id.ToString()}.");
            await RetryHelper.RetryTask(storageService.DeleteContainer(StorageAccount.Model, job.Id.ToString()));
            logger.LogInformation($"Deleted model data container for job {job.Id.ToString()}.");
            await RetryHelper.RetryTask(docDbService.DeleteDocument<BatchJob>(job.Id.ToString()));
            logger.LogInformation($"Deleted DocumentDB entity for job {job.Id.ToString()}.");
        }
    }
}
