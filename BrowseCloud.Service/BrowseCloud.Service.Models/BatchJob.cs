// <copyright file="BatchJob.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Models
{
    using System;
    using System.Runtime.Serialization;
    using BrowseCloud.Service.Models.Exceptions;

    /// <summary>
    /// The status of the Azure Batch task
    /// </summary>
    public enum JobStatus
    {
        /// <summary>
        /// Not Started Job. Queued
        /// </summary>
        NotStarted,

        /// <summary>
        /// Pre Processing
        /// </summary>
        PreProcessing,

        /// <summary>
        /// Training
        /// </summary>
        Training,

        /// <summary>
        /// Terminal State - Job Succeeded
        /// </summary>
        Success,

        /// <summary>
        /// Terminal State - Job Failed
        /// </summary>
        Failure,
    }

    /// <summary>
    /// The type of the job
    /// </summary>
    public enum JobType
    {
        /// <summary>
        /// Initial Generation of the Counting Grid.
        /// </summary>
        CountingGridGeneration,

        /// <summary>
        /// Generate sentiment based coloring.
        /// </summary>
        SentimentColoring,

        /// <summary>
        /// Generate metadata column based coloring.
        /// </summary>
        MetadataColoring,
    }

    /// <summary>
    /// Represents a Counting Grid learning job
    /// </summary>
    [DataContract]
    public class BatchJob
    {
        /// <summary>
        /// Initializes a new instance of the <see cref="BatchJob"/> class.
        /// </summary>
        public BatchJob()
        {
        }

        /// <summary>
        /// Initializes a new instance of the <see cref="BatchJob"/> class.
        /// </summary>
        /// <param name="documentId">Document Id for the document to process.</param>
        /// <param name="job">A job object to use for job parameters.</param>
        public BatchJob(Guid documentId, BatchJob job = null)
        {
            if (documentId == null)
            {
                throw new BrowseCloudValidationException("When creating a BatchJob, documentId can't be null.");
            }

            this.Id = Guid.NewGuid();
            this.DocumentId = documentId;
            this.TargetId = job?.TargetId;
            this.TargetColumnName = job?.TargetColumnName;
            this.Progress = 0;
            this.JobStatus = JobStatus.NotStarted;
            this.JobType = job?.JobType ?? JobType.CountingGridGeneration;
            this.WindowSize = job?.WindowSize ?? 5;
            this.ExtentSize = job?.ExtentSize ?? (this.JobType == JobType.CountingGridGeneration ? 24 : (int?)null);
            this.Settings = job?.Settings;
            this.SubmitDateTime = DateTime.UtcNow;
            this.UpdateDateTime = DateTime.UtcNow;
        }

        /// <summary>
        /// The identifier of the job.
        /// </summary>
        [DataMember(Name = "id")]
        public Guid Id { get; set; }

        /// <summary>
        /// The document the job belongs to.
        /// </summary>
        [DataMember(Name = "documentId")]
        public Guid DocumentId { get; set; }

        /// <summary>
        /// The id of the job results that should be processed for this job.
        /// </summary>
        [DataMember(Name = "targetId", IsRequired = false)]
        public Guid? TargetId { get; set; }

        /// <summary>
        /// The name of the column that should be processed in the previous job results
        /// </summary>
        [DataMember(Name = "targetColumnName", IsRequired = false)]
        public string TargetColumnName { get; set; }

        /// <summary>
        /// 0 - 100 percentage progress of the job.
        /// </summary>
        [DataMember(Name = "progress")]
        public int Progress { get; set; }

        /// <summary>
        /// The processing step.
        /// </summary>
        [DataMember(Name = "jobStatus")]
        public JobStatus JobStatus { get; set; }

        /// <summary>
        /// The type of the job.
        /// The job type
        /// </summary>
        [DataMember(Name = "jobType")]
        public JobType JobType { get; set; }

        /// <summary>
        /// Window size parameter.
        /// </summary>
        [DataMember(Name = "windowSize", IsRequired = false)]
        public int? WindowSize { get; set; }

        /// <summary>
        /// Extent size parameter.
        /// </summary>
        [DataMember(Name = "extentSize", IsRequired = false)]
        public int? ExtentSize { get; set; }

        /// <summary>
        /// Date job first submitted.
        /// </summary>
        [DataMember(Name = "submitDateTime")]
        public DateTime SubmitDateTime { get; set; }

        /// <summary>
        /// Date job finished.
        /// </summary>
        [DataMember(Name = "finishDateTime", EmitDefaultValue = false)]
        public DateTime? FinishDateTime { get; set; }

        /// <summary>
        /// Date job metadata updated.
        /// </summary>
        [DataMember(Name = "updateDateTime")]
        public DateTime UpdateDateTime { get; set; }

        /// <summary>
        /// Job client settings store.
        /// </summary>
        [DataMember(Name = "settings")]
        public object Settings { get; set; }
    }
}
