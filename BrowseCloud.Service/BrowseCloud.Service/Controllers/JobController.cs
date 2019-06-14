// <copyright file="JobController.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Controllers
{
    using System;
    using System.Collections.Generic;
    using System.Linq;
    using System.Threading.Tasks;
    using BrowseCloud.Service.Common.Helpers;
    using BrowseCloud.Service.Hubs;
    using BrowseCloud.Service.Models;
    using BrowseCloud.Service.Models.Configurations;
    using BrowseCloud.Service.Models.Exceptions;
    using BrowseCloud.Service.Models.Extensions;
    using BrowseCloud.Service.Services.AzureBatch;
    using BrowseCloud.Service.Services.AzureStorage;
    using BrowseCloud.Service.Services.DocumentDb;
    using BrowseCloud.Service.Services.Graph;
    using BrowseCloud.Service.Utils;
    using Microsoft.AspNetCore.Authorization;
    using Microsoft.AspNetCore.Mvc;
    using Microsoft.AspNetCore.SignalR;
    using Microsoft.Extensions.Logging;
    using Microsoft.Extensions.Options;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Converters;

    /// <summary>
    /// Controller for Jobs.
    /// </summary>
    [Authorize]
    [Route("api/v1/jobs")]
    [ApiController]
    public class JobController : BrowseCloudControllerBase
    {
        /// <summary>
        /// Azure Storage Service - Dependency Injected.
        /// </summary>
        private readonly IStorageService storageService;

        /// <summary>
        /// Azure Cosmos DB Service - Dependency Injected.
        /// </summary>
        private readonly IDocumentDbService documentDbService;

        /// <summary>
        /// Azure Batch Service - Dependency Injected.
        /// </summary>
        private readonly IBatchService batchService;

        /// <summary>
        /// JobUpdateHub - Dependency Injected.
        /// </summary>
        private readonly IHubContext<JobUpdateHub> jobUpdateHubContext;

        /// <summary>
        /// Graph Service - Dependency Injected.
        /// </summary>
        private readonly IGraphService graphService;

        /// <summary>
        /// Initializes a new instance of the <see cref="JobController"/> class.
        /// </summary>
        /// <param name="storageService">Azure Storage Location</param>
        /// <param name="docDbService">Document DB Service</param>
        /// <param name="batchService">Azure Batch</param>
        /// <param name="graphService">Graph Service</param>
        /// <param name="logger">Logger</param>
        /// <param name="hubContext">SignalR Hub Context</param>
        /// <param name="config">General Config</param>
        public JobController(
            IStorageService storageService,
            IDocumentDbService docDbService,
            IBatchService batchService,
            ILogger<JobController> logger,
            IOptions<GeneralConfig> config,
            IHubContext<JobUpdateHub> hubContext,
            IGraphService graphService)
            : base(logger, config)
        {
            this.storageService = storageService;
            this.documentDbService = docDbService;
            this.batchService = batchService;
            this.jobUpdateHubContext = hubContext;
            this.graphService = graphService;
        }

        /// <summary>
        /// Get all jobs the current user can access.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs</url>
        /// <verb>GET</verb>
        /// <response code="200"><see cref="List{T}"/> where T is <see cref="BatchJob"/>A list of jobs the current user can access.</response>
        [HttpGet]
        [Route("")]
        public async Task<IEnumerable<BatchJob>> Get()
        {
            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();
            var docs = await DocumentHelper.GetAllAccessibleDocuments(idsToSearch, this.documentDbService);
            var docIds = docs.Select((d) => d.Id);

            return await this.documentDbService.GetDocuments<BatchJob>((b) => docIds.Contains(b.DocumentId));
        }

        /// <summary>
        /// Get all public jobs accessible to all Microsoft.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs/public</url>
        /// <verb>GET</verb>
        /// <response code="200"><see cref="List{T}"/> where T is <see cref="BatchJob"/>A list of all public jobs.</response>
        [HttpGet]
        [Route("public")]
        public async Task<IEnumerable<BatchJob>> GetPublic()
        {
            var docs = await this.documentDbService.GetDocuments<Document>((doc) => doc.IsPublic == true);
            var docIds = docs.Select((d) => d.Id);

            return await this.documentDbService.GetDocuments<BatchJob>((b) => docIds.Contains(b.DocumentId));
        }

        /// <summary>
        /// Get a specific job.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs/{id}</url>
        /// <verb>GET</verb>
        /// <param name="id">Job ID.</param>
        /// <response code="200"><see cref="Document"/>A specific job.</response>
        [HttpGet]
        [Route("{id}")]
        public async Task<BatchJob> Get(string id)
        {
            return await this.GetJobIfValidAndAuthed(id, false);
        }

        /// <summary>
        /// Get model files for a specific job.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs/{id}/files/{fileName}</url>
        /// <verb>GET</verb>
        /// <param name="id">Job ID.</param>
        /// <param name="fileName">File to get.</param>
        /// <response code="200"><see cref="string"/>The text of the file for the job.</response>
        [HttpGet]
        [Route("{id}/files/{fileName}")]
        public async Task<ContentResult> GetFile(string id, string fileName)
        {
            var job = await this.GetJobIfValidAndAuthed(id, false);

            var docText = await JobHelper.GetFileFromJob(job, fileName, this.storageService);

            return new ContentResult
            {
                Content = docText,
                ContentType = "text/plain",
                StatusCode = 200,
            };
        }

        /// <summary>
        /// Modifies the job. Able to change the entire job for authorized client IDs.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs/{id}</url>
        /// <verb>PUT</verb>
        /// <param name="id">Job ID</param>
        /// <param name="job" in="body"><see cref="BatchJob"/>BatchJob entity.</param>
        /// <response code="200"><see cref="BatchJob"/>The modified job.</response>
        [HttpPut]
        [Route("{id}")]
        public async Task<BatchJob> Put(string id, [FromBody] BatchJob job)
        {
            if (job == null)
            {
                throw new BrowseCloudValidationException("You must include a valid BatchJob in the body of the request.");
            }

            if (job?.Progress > 100 || job?.Progress < 0)
            {
                throw new BrowseCloudValidationException("Progress must be between 0 and 100.");
            }

            if (this.config.PutJobAuthorizedClientIds?.Split(';', ',')?.Contains(this.User.Identity.GetAppId()) == true)
            {
                var oldJob = await this.documentDbService.GetDocument<BatchJob>(id);

                // Caution: This FullAccess scope should only be given to the ML backend. No training wheels at all.
                var replaceJob = new BatchJob
                {
                    Id = new Guid(id),
                    JobStatus = job.JobStatus,
                    Progress = job.Progress,
                    SubmitDateTime = oldJob.SubmitDateTime,
                    UpdateDateTime = DateTime.UtcNow,
                    DocumentId = oldJob.DocumentId,
                    ExtentSize = oldJob.ExtentSize,
                    WindowSize = oldJob.WindowSize,
                    Settings = job.Settings ?? oldJob.Settings,
                    JobType = oldJob.JobType,
                    TargetId = oldJob.TargetId,
                    TargetColumnName = oldJob.TargetColumnName,
                };

                if ((oldJob.JobStatus != JobStatus.Success && replaceJob.JobStatus == JobStatus.Success)
                    || (oldJob.JobStatus != JobStatus.Failure && replaceJob.JobStatus == JobStatus.Failure))
                {
                    this.logger.LogInformation($"Job {id} completed. Updating finishDateTime.");
                    replaceJob.FinishDateTime = DateTime.UtcNow;
                }

                await this.documentDbService.UpsertDocument(replaceJob);

                // Send signalr notification to users.
                var doc = await this.documentDbService.GetDocument<Document>(oldJob.DocumentId.ToString());
                var jobString = JsonConvert.SerializeObject(replaceJob, new StringEnumConverter());

                // Send to owner and acl.
                await this.jobUpdateHubContext.Clients.Group(doc.Id.ToString()).SendAsync("updateJob", jobString);

                return replaceJob;
            }
            else
            {
                var oldJob = await this.GetJobIfValidAndAuthed(id, true);

                // Only update settings store for job if it is a user.
                oldJob.Settings = job.Settings;

                await this.documentDbService.UpsertDocument(oldJob);

                return oldJob;
            }
        }

        /// <summary>
        /// Posts a new job.
        /// </summary>
        /// <url>http://localhost/api/v1/jobs</url>
        /// <verb>POST</verb>
        /// <param name="job" in="body"><see cref="BatchJob"/>Job to add.</param>
        /// <response code="200"><see cref="BatchJob"/>A new job.</response>
        [HttpPost]
        [Route("")]
        public async Task<BatchJob> Post([FromBody] BatchJob job)
        {
            if (job == null)
            {
                throw new BrowseCloudValidationException("You must include a valid BatchJob in the body of the request.");
            }

            if (job.DocumentId == null)
            {
                throw new BrowseCloudValidationException("You must include a valid BatchJob.DocumentId property");
            }

            if (job.JobType != JobType.CountingGridGeneration && job.TargetId == null)
            {
                throw new BrowseCloudValidationException("A job target id must be included for this type of job.");
            }

            var doc = await this.documentDbService.GetDocument<Document>(job.DocumentId.ToString());

            if (doc == null)
            {
                throw new BrowseCloudValidationException($"There is no document {job.DocumentId}");
            }

            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();

            if (!doc.UserCanModify(idsToSearch))
            {
                throw new BrowseCloudValidationException($"You are unauthorized to add a job to document {job.DocumentId}. No write access.");
            }

            return await JobHelper.MakeBatchJob(doc, this.config.CommandPrefix ?? string.Empty, this.documentDbService, this.batchService, this.logger, job);
        }

        /// <summary>
        /// Handles getting a single job and throwing errors if something is off
        /// such as invalid guid, no document, unauthed.
        /// </summary>
        /// <param name="id">Job ID.</param>
        /// <param name="writePermissions">Whether write permissions are needed or not.</param>
        /// <returns>BatchJob entity.</returns>
        private async Task<BatchJob> GetJobIfValidAndAuthed(string id, bool writePermissions)
        {
            var isGuid = Guid.TryParse(id, out var guidResult);

            if (!isGuid)
            {
                throw new BrowseCloudValidationException($"There is no guid in the url that could represent a job. '{id}' is not a guid.");
            }

            var job = await this.documentDbService.GetDocument<BatchJob>(id);

            if (job == null)
            {
                this.logger.LogInformation($"Job {id} cannot be found when requested.");
                throw new BrowseCloudPageNotFoundException($"Job {id} cannot be found.");
            }

            var doc = await this.documentDbService.GetDocument<Document>(job.DocumentId.ToString());

            var idsToSearch = await this.graphService.GetAllCurrentUserIdentities();

            if (!doc.UserCanRead(idsToSearch))
            {
                this.logger.LogInformation($"Job {id} was requested, but not returned because the user did not have permission.");
                throw new BrowseCloudPermissionsDeniedException($"You do not have permission to access job {id}. No permissions to document {doc.Id}");
            }

            if (writePermissions == true && !doc.UserCanModify(idsToSearch))
            {
                this.logger.LogInformation($"Job {id} was requested for write, but not returned because the user did not have permission to write.");
                throw new BrowseCloudPermissionsDeniedException($"You do not have permission to write to job {id}. No write permissions to document {doc.Id}");
            }

            return job;
        }
    }
}