using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Infrastructure;

public class DrawHistoryConfiguration : IEntityTypeConfiguration<DrawHistory>
{
    public void Configure(EntityTypeBuilder<DrawHistory> builder)
    {
        builder.HasKey(p => p.Id);

        builder.Property(p => p.DeviceInfo)
               .HasDefaultValue(string.Empty);

        builder.HasOne(p => p.Card)
               .WithMany(p => p.DrawHistories)
               .HasForeignKey(p => p.CardId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}